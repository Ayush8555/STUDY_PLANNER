const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// ──────────────────────────────────────────
// GET /api/schedule/tasks
// Fetch tasks for a specific date (defaults to today)
// ──────────────────────────────────────────
router.get('/tasks', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date } = req.query; // optional YYYY-MM-DD

    let queryDate = new Date();
    if (date) {
      queryDate = new Date(date);
    }
    // Normalize to start of day
    queryDate.setHours(0, 0, 0, 0);

    const tasks = await prisma.ssDailyTask.findMany({
      where: {
        user_id: userId,
        date: queryDate,
      },
      orderBy: { created_at: 'asc' },
    });

    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Fetch schedule tasks error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/schedule/tasks
// Create a new morning planner task
// ──────────────────────────────────────────
router.post('/tasks', async (req, res, next) => {
  try {
    console.log("Incoming request:", req.body);
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is missing' });
    }

    const { subject, topic, hours, minutes, priority, date } = req.body;

    if (!subject || !topic || (hours == null && minutes == null)) {
      return res.status(400).json({ success: false, message: 'subject, topic, hours, and minutes are required' });
    }

    let taskDate = new Date();
    if (date) {
      taskDate = new Date(date);
    }
    taskDate.setHours(0, 0, 0, 0);

    const total_minutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

    const task = await prisma.ssDailyTask.create({
      data: {
        user_id: userId,
        date: taskDate,
        subject,
        topic,
        estimated_minutes: total_minutes,
        priority: priority || 'medium',
      },
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Task added successfully', 
      data: task, 
      task // Keep task key for frontend compatibility 
    });
  } catch (error) {
    if (error.code === 'P2002' || error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Task already exists' });
    }
    console.error('Add Task Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
});

// ──────────────────────────────────────────
// PUT /api/schedule/tasks/:id/toggle
// Toggle task completion
// ──────────────────────────────────────────
router.put('/tasks/:id/toggle', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { is_completed } = req.body;

    // Verify ownership
    const existing = await prisma.ssDailyTask.findUnique({ where: { id } });
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const task = await prisma.ssDailyTask.update({
      where: { id },
      data: { is_completed },
    });

    res.json({ success: true, task });
  } catch (err) {
    console.error('Toggle task error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// DELETE /api/schedule/tasks/:id
// Delete a scheduled task
// ──────────────────────────────────────────
router.delete('/tasks/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await prisma.ssDailyTask.findUnique({ where: { id } });
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await prisma.ssDailyTask.delete({ where: { id } });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// POST /api/schedule/summary
// Night Tracker: Submit daily summary and update streak + progress
// ──────────────────────────────────────────
router.post('/summary', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { date, total_hours, subjects, topics, completed_tasks } = req.body;

    let summaryDate = new Date();
    if (date) {
      summaryDate = new Date(date);
    }
    summaryDate.setHours(0, 0, 0, 0);

    // 1. Upsert Summary
    const summary = await prisma.ssDailySummary.upsert({
      where: { user_id_date: { user_id: userId, date: summaryDate } },
      update: {
        total_hours: parseFloat(total_hours) || 0,
        subjects: subjects || [],
        topics: topics || [],
        completed_tasks: parseInt(completed_tasks) || 0,
      },
      create: {
        user_id: userId,
        date: summaryDate,
        total_hours: parseFloat(total_hours) || 0,
        subjects: subjects || [],
        topics: topics || [],
        completed_tasks: parseInt(completed_tasks) || 0,
      },
    });

    // 2. STREAK INTEGRATION & UPDATE
    const logsNum = parseFloat(total_hours) || 0;
    
    // Fetch current streak
    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });
    
    if (logsNum > 0) {
      if (streak) {
        const lastDate = streak.last_study_date ? new Date(streak.last_study_date) : null;
        const yesterday = new Date(summaryDate);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newCurrentStreak = streak.current_streak;
        
        if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
          // Continued streak
          newCurrentStreak += 1;
        } else if (!lastDate || lastDate.toDateString() !== summaryDate.toDateString()) {
          // New streak or gap
          newCurrentStreak = 1;
        }
        
        // if same day, no increment needed

        await prisma.studyStreak.update({
          where: { user_id: userId },
          data: {
            current_streak: newCurrentStreak,
            longest_streak: Math.max(newCurrentStreak, streak.longest_streak),
            last_study_date: summaryDate,
            total_xp: { increment: 50 }, // 50 XP for completing a night review
          },
        });
      } else {
        await prisma.studyStreak.create({
          data: {
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_study_date: summaryDate,
            total_xp: 50,
          },
        });
      }
    } else {
      // If student logs 0 hours, the streak logic technically marks a miss, but currently we just don't increment it.
      // Easiest is to let a gap naturally reset the streak next time they log.
    }

    // 3. PROGRESS TRACKING INTEGRATION
    // As requested: "When student logs topics update study_progress chapter_progress"
    if (topics && topics.length > 0 && subjects && subjects.length > 0) {
      const mainSubject = subjects[0]; // simplistic mapping
      
      // Upsert into spDailyStudyLog for dashboard views
      const displayTopics = topics.map(t => `${mainSubject}: ${t}`);
      await prisma.spDailyStudyLog.upsert({
        where: { user_id_date: { user_id: userId, date: summaryDate } },
        update: {
          total_time_minutes: { increment: Math.round(logsNum * 60) },
          topics_covered: { push: displayTopics },
        },
        create: {
          user_id: userId,
          date: summaryDate,
          total_time_minutes: Math.round(logsNum * 60),
          topics_covered: displayTopics,
        },
      });

      // Attempt to map topics to chapters and mark as completed (simplified)
      for (const t of topics) {
        await prisma.spChapterProgress.upsert({
          where: { user_id_subject_chapter_name: { user_id: userId, subject: mainSubject, chapter_name: t } },
          update: {
            is_completed: true,
            completion_date: summaryDate,
            time_spent_minutes: { increment: Math.round((logsNum * 60) / Math.max(1, topics.length)) }
          },
          create: {
            user_id: userId,
            subject: mainSubject,
            class: 0,
            chapter_name: t,
            is_completed: true,
            completion_date: summaryDate,
            time_spent_minutes: Math.round((logsNum * 60) / Math.max(1, topics.length))
          }
        });
      }
    }

    res.json({ success: true, summary, message: 'Night Tracker submitted successfully! Progress synced.' });
  } catch (err) {
    console.error('Submit summary error:', err);
    next(err);
  }
});

// ──────────────────────────────────────────
// GET /api/schedule/insights
// Automatic Insights for the Schedule Dashboard
// ──────────────────────────────────────────
router.get('/insights', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const insights = [];

    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });
    
    // Streak Insights
    if (streak && streak.current_streak > 0) {
      insights.push(`You studied ${streak.current_streak} days in a row 🔥 Keep it up!`);
    } else {
      insights.push(`Log your study today to start a new streak!`);
    }

    // Recent subjects insights
    const lastSummary = await prisma.ssDailySummary.findFirst({
      where: { user_id: userId },
      orderBy: { date: 'desc' },
    });

    if (lastSummary && lastSummary.subjects.length > 0) {
      insights.push(`You are focusing well on ${lastSummary.subjects.join(', ')}.`);
    }

    // Missed yesterday insight
    if (streak && streak.last_study_date) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const lastDate = new Date(streak.last_study_date);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 2) {
        insights.push(`It looks like you missed your study session recently. Let's get back on track! 🎯`);
      }
    }

    res.json({ success: true, insights });
  } catch (err) {
    console.error('Fetch schedule insights error:', err);
    next(err);
  }
});

module.exports = router;
