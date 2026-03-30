const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /api/dashboard — Aggregated dashboard data
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 1. Profile + Exam + Subjects + Topics + Chapters
    const profile = await prisma.studentProfile.findUnique({
      where: { user_id: userId },
      include: {
        exam: {
          include: {
            subjects: {
              include: {
                topics: {
                  include: { chapters: { include: { subtopics: true } } },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    // 2. Study Streak
    const streak = await prisma.studyStreak.findUnique({ where: { user_id: userId } });

    // 3. Subject Performance
    const subjectPerformance = await prisma.subjectPerformance.findMany({
      where: { user_id: userId },
      include: { subject: true },
      orderBy: { accuracy: 'asc' },
    });

    // 4. Recent Test Attempts
    const recentTests = await prisma.testAttempt.findMany({
      where: { user_id: userId },
      include: { test: true },
      orderBy: { started_at: 'desc' },
      take: 10,
    });

    // 5. Study Sessions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = await prisma.studySession.findMany({
      where: { user_id: userId, start_time: { gte: sevenDaysAgo } },
      include: { chapter: { include: { topic: { include: { subject: true } } } } },
      orderBy: { start_time: 'desc' },
    });

    // 6. Weak Topics
    const weakTopics = await prisma.weakTopic.findMany({
      where: { user_id: userId },
      include: { topic: { include: { subject: true } } },
      orderBy: { weakness_score: 'desc' },
      take: 5,
    });

    // 7. Achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: { achievement: true },
      orderBy: { unlocked_at: 'desc' },
      take: 5,
    });

    // 8. AI Recommendations
    const recommendations = await prisma.aiRecommendation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 3,
    });

    // Calculate aggregated stats
    const totalStudyMinutes = recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalTests = await prisma.testAttempt.count({ where: { user_id: userId } });
    const avgScore = recentTests.length > 0
      ? Math.round(recentTests.reduce((sum, t) => sum + (t.score || 0), 0) / recentTests.length)
      : null;

    // Weekly study hours (Mon–Sun breakdown)
    const weeklyHours = [0, 0, 0, 0, 0, 0, 0];
    recentSessions.forEach((s) => {
      const day = s.start_time.getDay(); // 0=Sun, 6=Sat
      const idx = day === 0 ? 6 : day - 1; // Convert to Mon=0, Sun=6
      weeklyHours[idx] += (s.duration_minutes || 0) / 60;
    });

    // Test score progression
    const testScores = recentTests
      .filter((t) => t.score !== null)
      .reverse()
      .map((t) => t.score);

    // Syllabus stats
    let totalChapters = 0;
    let subjectBreakdown = [];
    if (profile?.exam?.subjects) {
      subjectBreakdown = profile.exam.subjects.map((s) => {
        const topicCount = s.topics.length;
        const chapterCount = s.topics.reduce((sum, t) => sum + t.chapters.length, 0);
        totalChapters += chapterCount;
        return {
          id: s.id,
          name: s.name,
          topicCount,
          chapterCount,
          topics: s.topics.map((t) => ({
            id: t.id,
            name: t.name,
            chapterCount: t.chapters.length,
            chapters: t.chapters.map((c) => ({ id: c.id, name: c.name, estimatedMinutes: c.estimated_study_minutes, difficulty: c.difficulty_level, importance: c.importance_weight, subtopics: (c.subtopics || []).map(st => st.name) })),
          })),
        };
      });
    }

    // Days until exam
    let daysUntilExam = null;
    if (profile?.target_exam_date) {
      daysUntilExam = Math.ceil((new Date(profile.target_exam_date) - new Date()) / (1000 * 60 * 60 * 24));
    }

    const xp = streak?.total_xp || 0;
    const level = Math.floor(xp / 1000) + 1;
    const currentLevelXp = xp % 1000;
    const nextLevelXp = 1000;
    const progressPercent = Math.round((currentLevelXp / nextLevelXp) * 100);

    res.json({
      success: true,
      dashboard: {
        profile: {
          examName: profile?.exam?.name || 'Not Set',
          studentType: profile?.student_type || '',
          classLevel: profile?.class_level || '',
          examDate: profile?.target_exam_date || null,
          daysUntilExam,
        },
        stats: {
          totalStudyHours: Math.round(totalStudyMinutes / 60 * 10) / 10,
          totalTests,
          avgScore,
          currentStreak: streak?.current_streak || 0,
          longestStreak: streak?.longest_streak || 0,
          xp,
          level,
          currentLevelXp,
          nextLevelXp,
          progressPercent,
        },
        syllabus: {
          totalSubjects: subjectBreakdown.length,
          totalChapters,
          subjects: subjectBreakdown,
        },
        weeklyHours: weeklyHours.map((h) => Math.round(h * 10) / 10),
        testScores,
        weakTopics: weakTopics.map((w) => ({
          topic: w.topic.name,
          subject: w.topic.subject.name,
          score: Math.round((1 - w.weakness_score) * 100),
        })),
        subjectPerformance: subjectPerformance.map((sp) => ({
          subject: sp.subject.name,
          accuracy: Math.round(sp.accuracy),
          attempted: sp.questions_attempted,
        })),
        recentTests: recentTests.slice(0, 5).map((t) => ({
          id: t.id,
          type: t.test.test_type,
          score: t.score,
          accuracy: t.accuracy,
          date: t.started_at,
          timeTaken: t.time_taken,
        })),
        achievements: achievements.map((a) => ({
          name: a.achievement.name,
          description: a.achievement.description,
          unlockedAt: a.unlocked_at,
        })),
        recommendations: recommendations.map((r) => r.recommendation_text),
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    next(err);
  }
});

module.exports = router;
