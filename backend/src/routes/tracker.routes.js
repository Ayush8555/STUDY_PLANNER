const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// ─── HELPER: Initialize tracker for a new user ────────────────────
async function initializeUserTracker(userId) {
  // Check if user already has tracker entries
  const existing = await prisma.trackerUserTracker.count({ where: { user_id: userId } });
  if (existing > 0) return;

  // Get all chapters
  const chapters = await prisma.trackerChapter.findMany({
    select: { id: true, subject_id: true, class_id: true }
  });

  if (chapters.length === 0) return;

  // Bulk insert all chapters for this user
  await prisma.trackerUserTracker.createMany({
    data: chapters.map(ch => ({
      user_id: userId,
      subject_id: ch.subject_id,
      class_id: ch.class_id,
      chapter_id: ch.id,
      status: 'pending',
      ncert_read: false,
      revision1_done: false,
      revision2_done: false,
      revision3_done: false,
      revision4_done: false,
      priority: 'medium',
    })),
    skipDuplicates: true,
  });
}

// ─── GET /api/tracker/chapters ────────────────────────────────────
// Returns all chapters + user progress (with filters)
router.get('/chapters', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject, classNumber, search } = req.query;

    // Initialize tracker for user if first time
    await initializeUserTracker(userId);

    // Build where clause for chapters
    const chapterWhere = {};
    if (subject && subject !== 'all') {
      chapterWhere.subject = { name: subject };
    }
    if (classNumber) {
      const classNums = classNumber.split(',').map(Number).filter(n => !isNaN(n));
      if (classNums.length > 0) {
        chapterWhere.class = { class_number: { in: classNums } };
      }
    }
    if (search) {
      chapterWhere.chapter_name = { contains: search, mode: 'insensitive' };
    }

    // Get chapters with user progress
    const chapters = await prisma.trackerChapter.findMany({
      where: chapterWhere,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, class_number: true } },
        user_trackers: {
          where: { user_id: userId },
          select: {
            id: true,
            status: true,
            ncert_read: true,
            revision1_done: true,
            revision1_date: true,
            revision2_done: true,
            revision2_date: true,
            revision3_done: true,
            revision3_date: true,
            revision4_done: true,
            revision4_date: true,
            last_revised_at: true,
            priority: true,
          }
        }
      },
      orderBy: [
        { class: { class_number: 'asc' } },
        { subject: { name: 'asc' } },
        { chapter_number: 'asc' }
      ]
    });

    // Also get custom chapters for this user
    const customChapters = await prisma.trackerUserTracker.findMany({
      where: {
        user_id: userId,
        chapter_id: null,
        custom_topic_name: { not: null },
        ...(subject && subject !== 'all' ? { subject: { name: subject } } : {}),
        ...(search ? { custom_topic_name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, class_number: true } },
      }
    });

    // Format response
    const formatted = chapters.map(ch => {
      const progress = ch.user_trackers[0] || null;
      return {
        id: ch.id,
        chapter_name: ch.chapter_name,
        chapter_number: ch.chapter_number,
        subject: ch.subject.name,
        subject_id: ch.subject.id,
        class_number: ch.class.class_number,
        class_id: ch.class.id,
        is_custom: false,
        tracker_id: progress?.id || null,
        status: progress?.status || 'pending',
        ncert_read: progress?.ncert_read || false,
        revision1_done: progress?.revision1_done || false,
        revision1_date: progress?.revision1_date,
        revision2_done: progress?.revision2_done || false,
        revision2_date: progress?.revision2_date,
        revision3_done: progress?.revision3_done || false,
        revision3_date: progress?.revision3_date,
        revision4_done: progress?.revision4_done || false,
        revision4_date: progress?.revision4_date,
        last_revised_at: progress?.last_revised_at,
        priority: progress?.priority || 'medium',
      };
    });

    // Add custom chapters
    customChapters.forEach(ct => {
      formatted.push({
        id: ct.id,
        chapter_name: ct.custom_topic_name,
        chapter_number: null,
        subject: ct.subject?.name || 'Custom',
        subject_id: ct.subject_id,
        class_number: ct.class?.class_number || null,
        class_id: ct.class_id,
        is_custom: true,
        tracker_id: ct.id,
        status: ct.status,
        ncert_read: ct.ncert_read,
        revision1_done: ct.revision1_done,
        revision1_date: ct.revision1_date,
        revision2_done: ct.revision2_done,
        revision2_date: ct.revision2_date,
        revision3_done: ct.revision3_done,
        revision3_date: ct.revision3_date,
        revision4_done: ct.revision4_done,
        revision4_date: ct.revision4_date,
        last_revised_at: ct.last_revised_at,
        priority: ct.priority,
      });
    });

    // Get all available subjects and classes for filters
    const subjects = await prisma.trackerSubject.findMany({ orderBy: { name: 'asc' } });
    const classes = await prisma.trackerClass.findMany({ orderBy: { class_number: 'asc' } });

    res.json({
      success: true,
      chapters: formatted,
      filters: {
        subjects: subjects.map(s => ({ id: s.id, name: s.name })),
        classes: classes.map(c => ({ id: c.id, class_number: c.class_number })),
      }
    });
  } catch (err) {
    console.error('[Tracker] Error fetching chapters:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chapters' });
  }
});

// ─── POST /api/tracker/update-status ──────────────────────────────
// Update status, ncert_done, revision toggles for a chapter
router.post('/update-status', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tracker_id, chapter_id, field, value } = req.body;

    if (!field) {
      return res.status(400).json({ success: false, message: 'Field is required' });
    }

    // Find or create the tracker entry
    let tracker;
    if (tracker_id) {
      tracker = await prisma.trackerUserTracker.findFirst({
        where: { id: tracker_id, user_id: userId }
      });
    } else if (chapter_id) {
      tracker = await prisma.trackerUserTracker.findFirst({
        where: { user_id: userId, chapter_id: chapter_id }
      });
    }

    if (!tracker) {
      return res.status(404).json({ success: false, message: 'Tracker entry not found' });
    }

    // Build update data
    const updateData = {};
    const now = new Date();

    switch (field) {
      case 'status':
        if (!['pending', 'in_progress', 'completed'].includes(value)) {
          return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        updateData.status = value;
        // Auto-set ncert_done when completed
        if (value === 'completed') {
          updateData.ncert_read = true;
        }
        // Reset ncert_read if going back to pending
        if (value === 'pending') {
          updateData.ncert_read = false;
          updateData.revision1_done = false;
          updateData.revision1_date = null;
          updateData.revision2_done = false;
          updateData.revision2_date = null;
          updateData.revision3_done = false;
          updateData.revision3_date = null;
          updateData.revision4_done = false;
          updateData.revision4_date = null;
          updateData.last_revised_at = null;
        }
        break;

      case 'ncert_read':
        updateData.ncert_read = Boolean(value);
        break;

      case 'revision1_done':
        // R1 can only be toggled if status is completed
        if (tracker.status !== 'completed') {
          return res.status(400).json({ success: false, message: 'Complete the chapter first' });
        }
        updateData.revision1_done = Boolean(value);
        updateData.revision1_date = value ? now : null;
        if (value) updateData.last_revised_at = now;
        // If un-toggling R1, also un-toggle R2, R3, R4
        if (!value) {
          updateData.revision2_done = false;
          updateData.revision2_date = null;
          updateData.revision3_done = false;
          updateData.revision3_date = null;
          updateData.revision4_done = false;
          updateData.revision4_date = null;
        }
        break;

      case 'revision2_done':
        if (!tracker.revision1_done) {
          return res.status(400).json({ success: false, message: 'Complete Revision 1 first' });
        }
        updateData.revision2_done = Boolean(value);
        updateData.revision2_date = value ? now : null;
        if (value) updateData.last_revised_at = now;
        if (!value) {
          updateData.revision3_done = false;
          updateData.revision3_date = null;
          updateData.revision4_done = false;
          updateData.revision4_date = null;
        }
        break;

      case 'revision3_done':
        if (!tracker.revision2_done) {
          return res.status(400).json({ success: false, message: 'Complete Revision 2 first' });
        }
        updateData.revision3_done = Boolean(value);
        updateData.revision3_date = value ? now : null;
        if (value) updateData.last_revised_at = now;
        if (!value) {
          updateData.revision4_done = false;
          updateData.revision4_date = null;
        }
        break;

      case 'revision4_done':
        if (!tracker.revision3_done) {
          return res.status(400).json({ success: false, message: 'Complete Revision 3 first' });
        }
        updateData.revision4_done = Boolean(value);
        updateData.revision4_date = value ? now : null;
        if (value) updateData.last_revised_at = now;
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid field' });
    }

    const updated = await prisma.trackerUserTracker.update({
      where: { id: tracker.id },
      data: updateData,
    });

    // Log the action
    let actionType = 'status_change';
    if (field === 'ncert_read') actionType = 'ncert_done';
    if (field.startsWith('revision')) actionType = 'revision_done';

    await prisma.trackerLog.create({
      data: {
        user_id: userId,
        tracker_id: tracker.id,
        action_type: actionType,
        old_value: String(tracker[field] ?? ''),
        new_value: String(value),
      }
    });

    res.json({ success: true, tracker: updated });
  } catch (err) {
    console.error('[Tracker] Error updating status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// ─── GET /api/tracker/summary ─────────────────────────────────────
// Returns summary stats for the user
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Initialize tracker for user if first time
    await initializeUserTracker(userId);

    const trackers = await prisma.trackerUserTracker.findMany({
      where: { user_id: userId },
      select: {
        status: true,
        ncert_read: true,
        revision1_done: true,
        revision2_done: true,
        revision3_done: true,
        revision4_done: true,
      }
    });

    const total = trackers.length;
    const completed = trackers.filter(t => t.status === 'completed').length;
    const pending = trackers.filter(t => t.status === 'pending').length;
    const inProgress = trackers.filter(t => t.status === 'in_progress').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Revision health: % of completed chapters that have at least R2 done
    const completedTrackers = trackers.filter(t => t.status === 'completed');
    const revisedTwice = completedTrackers.filter(t => t.revision2_done).length;
    const revisionHealth = completedTrackers.length > 0
      ? Math.round((revisedTwice / completedTrackers.length) * 100) : 0;

    res.json({
      success: true,
      summary: {
        total_chapters: total,
        completed,
        pending,
        in_progress: inProgress,
        progress_percentage: progress,
        revision_health: revisionHealth,
      }
    });
  } catch (err) {
    console.error('[Tracker] Error fetching summary:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// ─── GET /api/tracker/weekly-summary ──────────────────────────────
// Returns weekly completion data and streak
router.get('/weekly-summary', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Chapters completed this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const logsThisWeek = await prisma.trackerLog.findMany({
      where: {
        user_id: userId,
        action_type: 'status_change',
        new_value: 'completed',
        created_at: { gte: startOfWeek },
      },
      select: { tracker_id: true }
    });

    const uniqueTrackerIds = [...new Set(logsThisWeek.map(l => l.tracker_id))];

    const completedThisWeek = await prisma.trackerUserTracker.count({
      where: {
        id: { in: uniqueTrackerIds },
        status: 'completed',
      }
    });

    // Calculate streak: count consecutive days with at least one log entry
    const logs = await prisma.trackerLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    let streak = 0;
    if (logs.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get unique dates
      const uniqueDates = [...new Set(logs.map(l => {
        const d = new Date(l.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }))].sort((a, b) => b - a);

      // Check if the most recent log is today or yesterday
      const mostRecent = uniqueDates[0];
      const diff = Math.floor((today.getTime() - mostRecent) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const daysDiff = Math.floor((uniqueDates[i - 1] - uniqueDates[i]) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    res.json({
      success: true,
      weekly: {
        completed_this_week: completedThisWeek,
        streak,
      }
    });
  } catch (err) {
    console.error('[Tracker] Error fetching weekly summary:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly summary' });
  }
});

// ─── POST /api/tracker/add-chapter ────────────────────────────────
// Add a custom chapter
router.post('/add-chapter', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject_name, class_number, chapter_name } = req.body;

    if (!subject_name || !chapter_name) {
      return res.status(400).json({ success: false, message: 'Subject and chapter name are required' });
    }

    // Find or validate subject
    let subject = await prisma.trackerSubject.findFirst({
      where: { name: { equals: subject_name, mode: 'insensitive' } }
    });

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Invalid subject. Use: History, Geography, Polity, Economics, Science' });
    }

    // Find class if provided
    let classRecord = null;
    if (class_number) {
      classRecord = await prisma.trackerClass.findFirst({
        where: { class_number: parseInt(class_number) }
      });
    }

    // Check for duplicate
    const existing = await prisma.trackerUserTracker.findFirst({
      where: {
        user_id: userId,
        subject_id: subject.id,
        custom_topic_name: chapter_name,
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'This chapter already exists in your tracker' });
    }

    // Create the custom tracker entry
    const tracker = await prisma.trackerUserTracker.create({
      data: {
        user_id: userId,
        subject_id: subject.id,
        class_id: classRecord?.id || null,
        chapter_id: null,
        custom_topic_name: chapter_name,
        status: 'pending',
        ncert_read: false,
        priority: 'medium',
      }
    });

    // Also save to custom_topics table for reference
    await prisma.trackerCustomTopic.create({
      data: {
        user_id: userId,
        subject_id: subject.id,
        class_id: classRecord?.id || null,
        topic_name: chapter_name,
      }
    }).catch(() => {}); // Ignore if duplicate

    res.json({
      success: true,
      chapter: {
        id: tracker.id,
        chapter_name: chapter_name,
        subject: subject.name,
        class_number: classRecord?.class_number || null,
        status: 'pending',
        is_custom: true,
        tracker_id: tracker.id,
      }
    });
  } catch (err) {
    console.error('[Tracker] Error adding chapter:', err);
    res.status(500).json({ success: false, message: 'Failed to add chapter' });
  }
});

module.exports = router;
