const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');
const { generateAutoRevisionPlan } = require('../services/ai.service');

router.use(authMiddleware);

// ──────────────────────────────────────────
// POST /api/progress/generate-revision-plan
// AI-powered: analyze progress & generate revision plan
// ──────────────────────────────────────────
router.post('/generate-revision-plan', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 1. Gather all progress data
    const chapterProgress = await prisma.spChapterProgress.findMany({
      where: { user_id: userId },
      orderBy: [{ subject: 'asc' }, { chapter_name: 'asc' }],
    });

    const subjectProgress = await prisma.spSubjectProgress.findMany({
      where: { user_id: userId },
      orderBy: { subject: 'asc' },
    });

    const weakTopics = await prisma.spWeakTopic.findMany({
      where: { user_id: userId },
      orderBy: { accuracy_percentage: 'asc' },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyLogs = await prisma.spDailyStudyLog.findMany({
      where: { user_id: userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
    });

    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });

    const totalChapters = chapterProgress.length;
    const completedChapters = chapterProgress.filter(c => c.is_completed).length;
    const totalStudyMinutes = chapterProgress.reduce((sum, c) => sum + c.time_spent_minutes, 0);

    // Build progress data payload for AI
    const progressData = {
      chapters: chapterProgress.map(c => ({
        subject: c.subject,
        chapterName: c.chapter_name,
        isCompleted: c.is_completed,
        completionDate: c.completion_date,
        timeSpentMinutes: c.time_spent_minutes,
      })),
      subjects: subjectProgress.map(sp => ({
        subject: sp.subject,
        totalChapters: sp.total_chapters,
        completedChapters: sp.completed_chapters,
        percentage: Math.round(sp.progress_percentage),
      })),
      weakTopics: weakTopics.map(w => ({
        subject: w.subject,
        topicName: w.topic_name,
        accuracy: Math.round(w.accuracy_percentage),
        isWeak: w.accuracy_percentage < 60,
      })),
      dailyStudy: dailyLogs.map(l => ({
        date: l.date,
        minutes: l.total_time_minutes,
        topics: l.topics_covered,
      })),
      streak: {
        current: streak?.current_streak || 0,
        longest: streak?.longest_streak || 0,
        xp: streak?.total_xp || 0,
      },
      overall: {
        totalChapters,
        completedChapters,
        totalStudyMinutes,
      },
    };

    // 2. Call AI to generate revision plan
    console.log('[Progress] Generating AI revision plan for user:', userId);
    const aiResult = await generateAutoRevisionPlan(progressData);

    // 3. Save revision schedules to smart_revision tables
    const savedSchedules = [];
    if (aiResult?.revision_plan && Array.isArray(aiResult.revision_plan)) {
      for (const plan of aiResult.revision_plan) {
        if (!plan.subject || !plan.topic || !plan.revision_dates) continue;

        let stage = 1;
        const studyDate = new Date();

        for (const dateStr of plan.revision_dates) {
          const revDate = new Date(dateStr);
          if (isNaN(revDate.getTime())) continue;

          const diffDays = Math.max(1, Math.ceil(Math.abs(revDate - studyDate) / (1000 * 60 * 60 * 24)));

          const schedule = await prisma.srRevisionSchedule.create({
            data: {
              user_id: userId,
              subject: plan.subject,
              topic: plan.topic,
              chapter: plan.chapter || null,
              next_revision_date: revDate,
              priority_level: plan.priority || 'medium',
              interval_days: diffDays,
              revision_stage: stage++,
            },
          });
          savedSchedules.push(schedule);
        }
      }
    }

    // 4. Award XP for generating a plan
    await prisma.studyStreak.upsert({
      where: { user_id: userId },
      update: { total_xp: { increment: 50 } },
      create: { user_id: userId, current_streak: 0, longest_streak: 0, total_xp: 50 },
    });

    res.json({
      success: true,
      revisionPlan: aiResult,
      schedulesCreated: savedSchedules.length,
      message: `AI generated ${aiResult?.revision_plan?.length || 0} revision items with ${savedSchedules.length} scheduled dates.`,
    });
  } catch (err) {
    console.error('Generate revision plan error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/complete-chapter
// Mark a chapter as completed & update aggregates
// ──────────────────────────────────────────
router.post('/complete-chapter', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, class: classLevel, chapter_name, time_spent_minutes } = req.body;

    if (!subject || !chapter_name) {
      return res.status(400).json({ success: false, message: 'subject and chapter_name are required' });
    }

    // 1. Upsert chapter progress
    const chapter = await prisma.spChapterProgress.upsert({
      where: {
        user_id_subject_chapter_name: { user_id: userId, subject, chapter_name },
      },
      update: {
        is_completed: true,
        completion_date: new Date(),
        time_spent_minutes: { increment: time_spent_minutes || 0 },
      },
      create: {
        user_id: userId,
        subject,
        class: classLevel || 0,
        chapter_name,
        is_completed: true,
        completion_date: new Date(),
        time_spent_minutes: time_spent_minutes || 0,
      },
    });

    // 2. Recalculate subject progress
    const chapterCount = await prisma.spChapterProgress.count({
      where: { user_id: userId, subject },
    });
    const completedCount = await prisma.spChapterProgress.count({
      where: { user_id: userId, subject, is_completed: true },
    });

    await prisma.spSubjectProgress.upsert({
      where: { user_id_subject: { user_id: userId, subject } },
      update: {
        total_chapters: chapterCount,
        completed_chapters: completedCount,
        progress_percentage: chapterCount > 0 ? (completedCount / chapterCount) * 100 : 0,
      },
      create: {
        user_id: userId,
        subject,
        total_chapters: chapterCount,
        completed_chapters: completedCount,
        progress_percentage: chapterCount > 0 ? (completedCount / chapterCount) * 100 : 0,
      },
    });

    // 3. Update daily study log
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.spDailyStudyLog.upsert({
      where: { user_id_date: { user_id: userId, date: today } },
      update: {
        total_time_minutes: { increment: time_spent_minutes || 0 },
        topics_covered: { push: `${subject}: ${chapter_name}` },
      },
      create: {
        user_id: userId,
        date: today,
        total_time_minutes: time_spent_minutes || 0,
        topics_covered: [`${subject}: ${chapter_name}`],
      },
    });

    // 4. Update study streak
    await prisma.studyStreak.upsert({
      where: { user_id: userId },
      update: {
        last_study_date: today,
        total_xp: { increment: 25 },
      },
      create: {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        total_xp: 25,
        last_study_date: today,
      },
    });

    // Update streak count if last study was yesterday
    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });
    if (streak) {
      const lastDate = streak.last_study_date ? new Date(streak.last_study_date) : null;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
        const newStreak = streak.current_streak + 1;
        await prisma.studyStreak.update({
          where: { user_id: userId },
          data: {
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streak.longest_streak),
            last_study_date: today,
          },
        });
      } else if (!lastDate || lastDate.toDateString() !== today.toDateString()) {
        await prisma.studyStreak.update({
          where: { user_id: userId },
          data: { current_streak: 1, last_study_date: today },
        });
      }
    }

    res.json({
      success: true,
      chapter,
      message: `Chapter "${chapter_name}" marked as complete`,
    });
  } catch (err) {
    console.error('Complete chapter error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/uncomplete-chapter
// Mark a chapter as not completed (undo)
// ──────────────────────────────────────────
router.post('/uncomplete-chapter', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, chapter_name } = req.body;

    if (!subject || !chapter_name) {
      return res.status(400).json({ success: false, message: 'subject and chapter_name are required' });
    }

    await prisma.spChapterProgress.updateMany({
      where: { user_id: userId, subject, chapter_name },
      data: { is_completed: false, completion_date: null },
    });

    // Recalculate subject progress
    const chapterCount = await prisma.spChapterProgress.count({
      where: { user_id: userId, subject },
    });
    const completedCount = await prisma.spChapterProgress.count({
      where: { user_id: userId, subject, is_completed: true },
    });

    await prisma.spSubjectProgress.upsert({
      where: { user_id_subject: { user_id: userId, subject } },
      update: {
        total_chapters: chapterCount,
        completed_chapters: completedCount,
        progress_percentage: chapterCount > 0 ? (completedCount / chapterCount) * 100 : 0,
      },
      create: {
        user_id: userId,
        subject,
        total_chapters: chapterCount,
        completed_chapters: completedCount,
        progress_percentage: chapterCount > 0 ? (completedCount / chapterCount) * 100 : 0,
      },
    });

    res.json({ success: true, message: `Chapter "${chapter_name}" marked as incomplete` });
  } catch (err) {
    console.error('Uncomplete chapter error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// GET /api/progress/overview
// Full progress dashboard data
// ──────────────────────────────────────────
router.get('/overview', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 1. Subject progress
    const subjectProgress = await prisma.spSubjectProgress.findMany({
      where: { user_id: userId },
      orderBy: { subject: 'asc' },
    });

    // 2. All chapter progress
    const chapterProgress = await prisma.spChapterProgress.findMany({
      where: { user_id: userId },
      orderBy: [{ subject: 'asc' }, { chapter_name: 'asc' }],
    });

    // 3. Daily study log (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyLogs = await prisma.spDailyStudyLog.findMany({
      where: {
        user_id: userId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // 4. Weak topics
    const weakTopics = await prisma.spWeakTopic.findMany({
      where: { user_id: userId },
      orderBy: { accuracy_percentage: 'asc' },
    });

    // 5. Study streak
    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });

    // 6. Calculate overall progress
    const totalChapters = chapterProgress.length;
    const completedChapters = chapterProgress.filter(c => c.is_completed).length;
    const overallPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    // 7. Total study time
    const totalStudyMinutes = chapterProgress.reduce((sum, c) => sum + c.time_spent_minutes, 0);

    // 8. Build 7-day chart data
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const log = dailyLogs.find(l => new Date(l.date).toDateString() === d.toDateString());
      last7Days.push({
        date: d.toISOString().split('T')[0],
        dayName: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
        minutes: log?.total_time_minutes || 0,
        topics: log?.topics_covered || [],
      });
    }

    // 9. Smart suggestions
    const suggestions = [];
    const weakSubjects = weakTopics.filter(w => w.accuracy_percentage < 60);
    weakSubjects.forEach(w => {
      suggestions.push({
        type: 'weak_topic',
        icon: '⚠️',
        message: `You are weak in ${w.topic_name} (${w.subject}). Consider revising!`,
        subject: w.subject,
        topic: w.topic_name,
      });
    });

    // Suggest incomplete subjects with low progress
    subjectProgress.forEach(sp => {
      if (sp.progress_percentage > 0 && sp.progress_percentage < 50) {
        suggestions.push({
          type: 'low_progress',
          icon: '📚',
          message: `${sp.subject} is only ${Math.round(sp.progress_percentage)}% complete. Keep going!`,
          subject: sp.subject,
        });
      }
    });

    // Suggest revision for recently completed chapters
    const recentlyCompleted = chapterProgress
      .filter(c => c.is_completed && c.completion_date)
      .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date))
      .slice(0, 3);
    recentlyCompleted.forEach(c => {
      const daysSince = Math.floor((Date.now() - new Date(c.completion_date)) / (1000 * 60 * 60 * 24));
      if (daysSince >= 3) {
        suggestions.push({
          type: 'revision',
          icon: '🔄',
          message: `Revise "${c.chapter_name}" — it's been ${daysSince} days since completion.`,
          subject: c.subject,
          chapter: c.chapter_name,
        });
      }
    });

    res.json({
      success: true,
      progress: {
        overall: {
          totalChapters,
          completedChapters,
          percentage: overallPercentage,
          totalStudyMinutes,
          totalStudyHours: Math.round((totalStudyMinutes / 60) * 10) / 10,
        },
        subjects: subjectProgress.map(sp => ({
          subject: sp.subject,
          totalChapters: sp.total_chapters,
          completedChapters: sp.completed_chapters,
          percentage: Math.round(sp.progress_percentage),
        })),
        chapters: chapterProgress.map(c => ({
          id: c.id,
          subject: c.subject,
          class: c.class,
          chapterName: c.chapter_name,
          isCompleted: c.is_completed,
          completionDate: c.completion_date,
          timeSpentMinutes: c.time_spent_minutes,
        })),
        dailyStudy: last7Days,
        weakTopics: weakTopics.map(w => ({
          id: w.id,
          subject: w.subject,
          topicName: w.topic_name,
          accuracy: Math.round(w.accuracy_percentage),
          lastTested: w.last_tested,
          isWeak: w.accuracy_percentage < 60,
        })),
        streak: {
          current: streak?.current_streak || 0,
          longest: streak?.longest_streak || 0,
          xp: streak?.total_xp || 0,
          lastStudyDate: streak?.last_study_date || null,
        },
        suggestions: suggestions.slice(0, 5),
      },
    });
  } catch (err) {
    console.error('Progress overview error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/daily-log
// Create or update daily study log
// ──────────────────────────────────────────
router.post('/daily-log', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { time_minutes, topics } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await prisma.spDailyStudyLog.upsert({
      where: { user_id_date: { user_id: userId, date: today } },
      update: {
        total_time_minutes: { increment: time_minutes || 0 },
        topics_covered: topics ? { push: topics } : undefined,
      },
      create: {
        user_id: userId,
        date: today,
        total_time_minutes: time_minutes || 0,
        topics_covered: topics || [],
      },
    });

    res.json({ success: true, log });
  } catch (err) {
    console.error('Daily log error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// GET /api/progress/weak-topics
// ──────────────────────────────────────────
router.get('/weak-topics', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const weakTopics = await prisma.spWeakTopic.findMany({
      where: { user_id: userId },
      orderBy: { accuracy_percentage: 'asc' },
    });

    res.json({
      success: true,
      weakTopics: weakTopics.map(w => ({
        id: w.id,
        subject: w.subject,
        topicName: w.topic_name,
        accuracy: Math.round(w.accuracy_percentage),
        lastTested: w.last_tested,
        isWeak: w.accuracy_percentage < 60,
      })),
    });
  } catch (err) {
    console.error('Weak topics error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/start-session
// Auto-sync: record when user starts reading
// ──────────────────────────────────────────
router.post('/start-session', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, class: classLevel, chapter_name } = req.body;

    if (!subject || !chapter_name) {
      return res.status(400).json({ success: false, message: 'subject and chapter_name are required' });
    }

    // Upsert a chapter record (creates if doesn't exist) — not marking completed yet
    await prisma.spChapterProgress.upsert({
      where: {
        user_id_subject_chapter_name: { user_id: userId, subject, chapter_name },
      },
      update: {}, // No update needed on start
      create: {
        user_id: userId,
        subject,
        class: classLevel || 0,
        chapter_name,
        is_completed: false,
        time_spent_minutes: 0,
      },
    });

    // Store session start in response (client will track it)
    res.json({
      success: true,
      session: {
        subject,
        chapter_name,
        started_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Start session error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/end-session
// Auto-sync: record time spent when user finishes
// ──────────────────────────────────────────
router.post('/end-session', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, chapter_name, duration_minutes } = req.body;

    if (!subject || !chapter_name || duration_minutes == null) {
      return res.status(400).json({ success: false, message: 'subject, chapter_name, and duration_minutes are required' });
    }

    // Update time spent on chapter
    await prisma.spChapterProgress.updateMany({
      where: { user_id: userId, subject, chapter_name },
      data: { time_spent_minutes: { increment: Math.round(duration_minutes) } },
    });

    // Update daily log
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.spDailyStudyLog.upsert({
      where: { user_id_date: { user_id: userId, date: today } },
      update: {
        total_time_minutes: { increment: Math.round(duration_minutes) },
        topics_covered: { push: `${subject}: ${chapter_name}` },
      },
      create: {
        user_id: userId,
        date: today,
        total_time_minutes: Math.round(duration_minutes),
        topics_covered: [`${subject}: ${chapter_name}`],
      },
    });

    res.json({
      success: true,
      message: `Session logged: ${Math.round(duration_minutes)} minutes on "${chapter_name}"`,
    });
  } catch (err) {
    console.error('End session error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/progress/report-weak-topic
// Report or update a weak topic from test results
// ──────────────────────────────────────────
router.post('/report-weak-topic', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subject, topic_name, accuracy_percentage } = req.body;

    if (!subject || !topic_name || accuracy_percentage == null) {
      return res.status(400).json({ success: false, message: 'subject, topic_name, and accuracy_percentage are required' });
    }

    const topic = await prisma.spWeakTopic.upsert({
      where: {
        user_id_subject_topic_name: { user_id: userId, subject, topic_name },
      },
      update: {
        accuracy_percentage,
        last_tested: new Date(),
      },
      create: {
        user_id: userId,
        subject,
        topic_name,
        accuracy_percentage,
        last_tested: new Date(),
      },
    });

    res.json({
      success: true,
      topic,
      isWeak: accuracy_percentage < 60,
    });
  } catch (err) {
    console.error('Report weak topic error:', err);
    next(err);
  }
});

module.exports = router;
