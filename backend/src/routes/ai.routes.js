const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const aiService = require('../services/ai.service');
const { addAIJob } = require('../queues');
const authMiddleware = require('../middleware/auth.middleware');

// All AI routes require authentication
router.use(authMiddleware);

// POST /api/ai/generate-questions — generate AI questions for a chapter
router.post('/generate-questions', async (req, res, next) => {
  try {
    const { chapterId, topic, subject, difficulty = 'medium', count = 5, async: useAsync = false } = req.body;

    // Resolve user's target exam for goal-based questions
    const userId = req.user.userId;
    let targetExam = '';
    try {
      const profile = await prisma.studentProfile.findUnique({ where: { user_id: userId }, include: { exam: true } });
      if (profile?.exam?.name) targetExam = profile.exam.name;
      else {
        const onboarding = await prisma.onboarding.findUnique({ where: { user_id: userId } });
        if (onboarding?.target_exam) targetExam = onboarding.target_exam;
      }
      if (!targetExam) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { goal: true } });
        if (user?.goal) targetExam = user.goal;
      }
    } catch (e) { /* silently continue */ }

    if (useAsync) {
      // Queue it as a background job
      const job = await addAIJob('generate-questions', { chapterId, topic, subject, difficulty, count });
      if (job) {
        return res.json({ success: true, message: 'Question generation queued', jobId: job.id });
      }
    }

    // Synchronous fallback: generate directly
    const questions = await aiService.generateQuestions({ topic, subject, difficulty, count, targetExam });

    // Store in DB
    const created = [];
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          chapter_id: chapterId,
          question_text: q.question_text,
          difficulty: q.difficulty || difficulty,
          source: 'ai',
          options: {
            create: q.options.map((opt) => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct,
            })),
          },
          explanations: {
            create: [{ explanation: q.explanation }],
          },
        },
        include: { options: true, explanations: true },
      });
      created.push(question);
    }

    res.status(201).json({ success: true, questions: created });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-explanation — generate explanation for a question
router.post('/generate-explanation', async (req, res, next) => {
  try {
    const { questionId } = req.body;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true, chapter: { include: { topic: { include: { subject: true } } } } },
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const correctOption = question.options.find((o) => o.is_correct);
    const explanation = await aiService.generateExplanation({
      question: question.question_text,
      correctAnswer: correctOption?.option_text || 'N/A',
      subject: question.chapter?.topic?.subject?.name || 'General',
    });

    const saved = await prisma.questionExplanation.create({
      data: { question_id: questionId, explanation },
    });

    res.status(201).json({ success: true, explanation: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-timetable — generate AI study timetable
router.post('/generate-timetable', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { subjects, availability, targetExamDate, weakTopics = [] } = req.body;

    const result = await aiService.generateTimetable({ subjects, availability, targetExamDate, weakTopics });

    // Store recommendations
    if (result.recommendations) {
      for (const rec of result.recommendations) {
        await prisma.aiRecommendation.create({
          data: { user_id: userId, recommendation_text: rec },
        });
      }
    }

    res.json({ success: true, timetable: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/recommendations — generate personalized recommendations
router.post('/recommendations', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Fetch weak topics and performance data
    const weakTopics = await prisma.weakTopic.findMany({
      where: { user_id: userId },
      include: { topic: { include: { subject: true } } },
    });

    const performance = await prisma.topicPerformance.findMany({
      where: { user_id: userId },
      include: { topic: true },
    });

    const recommendations = await aiService.generateRecommendations({
      weakTopics: weakTopics.map((w) => ({
        topic: w.topic.name,
        subject: w.topic.subject?.name,
        weakness_score: w.weakness_score,
      })),
      performanceData: performance.map((p) => ({
        topic: p.topic.name,
        accuracy: p.accuracy,
        attempts: p.attempts,
      })),
    });

    // Store recommendations
    for (const rec of recommendations) {
      await prisma.aiRecommendation.create({
        data: { user_id: userId, recommendation_text: rec.recommendation_text },
      });
    }

    res.json({ success: true, recommendations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
