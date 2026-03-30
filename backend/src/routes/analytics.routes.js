const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/analytics/:userId/subject-performance
router.get('/:userId/subject-performance', async (req, res, next) => {
  try {
    const performance = await prisma.subjectPerformance.findMany({
      where: { user_id: req.params.userId },
      include: { subject: true },
      orderBy: { accuracy: 'asc' },
    });

    res.json({ success: true, performance });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/:userId/topic-performance
router.get('/:userId/topic-performance', async (req, res, next) => {
  try {
    const performance = await prisma.topicPerformance.findMany({
      where: { user_id: req.params.userId },
      include: { topic: { include: { subject: true } } },
      orderBy: { accuracy: 'asc' },
    });

    res.json({ success: true, performance });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/:userId/weak-topics
router.get('/:userId/weak-topics', async (req, res, next) => {
  try {
    const weakTopics = await prisma.weakTopic.findMany({
      where: { user_id: req.params.userId },
      include: { topic: { include: { subject: true } } },
      orderBy: { weakness_score: 'desc' },
    });

    res.json({ success: true, weakTopics });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/:userId/recommendations
router.get('/:userId/recommendations', async (req, res, next) => {
  try {
    const recommendations = await prisma.aiRecommendation.findMany({
      where: { user_id: req.params.userId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json({ success: true, recommendations });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/:userId/study-stats
router.get('/:userId/study-stats', async (req, res, next) => {
  try {
    // Study streak
    const streak = await prisma.studyStreak.findUnique({
      where: { user_id: req.params.userId },
    });

    // Achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { user_id: req.params.userId },
      include: { achievement: true },
      orderBy: { unlocked_at: 'desc' },
    });

    // Total study hours (sum of all sessions)
    const studySessions = await prisma.studySession.aggregate({
      where: { user_id: req.params.userId },
      _sum: { duration_minutes: true },
      _count: true,
    });

    // Test stats
    const testStats = await prisma.testAttempt.aggregate({
      where: { user_id: req.params.userId },
      _avg: { accuracy: true },
      _count: true,
    });

    res.json({
      success: true,
      stats: {
        streak,
        achievements,
        totalStudyMinutes: studySessions._sum.duration_minutes || 0,
        totalSessions: studySessions._count,
        avgTestAccuracy: testStats._avg.accuracy || 0,
        totalTestAttempts: testStats._count,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/:userId/daily-study — daily study hours chart
router.get('/:userId/daily-study', async (req, res, next) => {
  try {
    const sessions = await prisma.studySession.findMany({
      where: { user_id: req.params.userId },
      select: { start_time: true, duration_minutes: true },
      orderBy: { start_time: 'asc' },
    });

    // Group by date
    const dailyMap = {};
    sessions.forEach((s) => {
      const date = s.start_time.toISOString().split('T')[0];
      dailyMap[date] = (dailyMap[date] || 0) + (s.duration_minutes || 0);
    });

    const dailyStudy = Object.entries(dailyMap).map(([date, minutes]) => ({ date, minutes }));

    res.json({ success: true, dailyStudy });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
