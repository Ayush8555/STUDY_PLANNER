const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// POST /api/tests — create a new test
router.post('/', async (req, res, next) => {
  try {
    const { user_id, test_type, difficulty, question_ids } = req.body;

    const test = await prisma.test.create({
      data: {
        user_id,
        test_type,
        difficulty,
        test_questions: {
          create: question_ids.map((qId, idx) => ({
            question_id: qId,
            question_order: idx + 1,
          })),
        },
      },
      include: { test_questions: { include: { question: { include: { options: true } } } } },
    });

    res.status(201).json({ success: true, test });
  } catch (err) {
    next(err);
  }
});

// GET /api/tests/:testId — get a test with questions
router.get('/:testId', async (req, res, next) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.testId },
      include: {
        test_questions: {
          include: { question: { include: { options: true } } },
          orderBy: { question_order: 'asc' },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    res.json({ success: true, test });
  } catch (err) {
    next(err);
  }
});

// POST /api/tests/:testId/attempt — submit a test attempt
router.post('/:testId/attempt', async (req, res, next) => {
  try {
    const { user_id, answers, time_taken } = req.body;
    // answers: [{ question_id, selected_option_id }]

    if (!answers || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'No answers provided.' });
    }

    // Fetch correct answers
    const questionIds = answers.map((a) => a.question_id);
    const correctOptions = await prisma.questionOption.findMany({
      where: { question_id: { in: questionIds }, is_correct: true },
    });

    const correctMap = {};
    correctOptions.forEach((opt) => { correctMap[opt.question_id] = opt.id; });

    let correctCount = 0;
    const userAnswersData = answers.map((a) => {
      const isCorrect = correctMap[a.question_id] === a.selected_option_id;
      if (isCorrect) correctCount++;
      return {
        question_id: a.question_id,
        selected_option_id: a.selected_option_id,
        is_correct: isCorrect,
        time_spent_seconds: a.time_spent_seconds || null,
      };
    });

    const accuracy = answers.length > 0 ? (correctCount / answers.length) * 100 : 0;

    // Create the test attempt with user answers
    const attempt = await prisma.testAttempt.create({
      data: {
        user_id,
        test_id: req.params.testId,
        completed_at: new Date(),
        score: correctCount,
        accuracy,
        time_taken,
        user_answers: { create: userAnswersData },
      },
      include: {
         user_answers: {
             include: { question: { include: { chapter: { include: { topic: { include: { subject: true } } } } } } }
         }
      },
    });

    // ── Performance Calculation ──────────────────────────────────────────────
    // Group answers by subject_id and topic_id to aggregate accuracy
    const subjectStats = {}; // { subject_id: { correct, total } }
    const topicStats = {};   // { topic_id: { correct, total } }

    for (const ans of attempt.user_answers) {
      if (!ans.question?.chapter?.topic?.subject) continue;
      
      const subjectId = ans.question.chapter.topic.subject.id;
      const topicId = ans.question.chapter.topic.id;

      if (!subjectStats[subjectId]) subjectStats[subjectId] = { correct: 0, total: 0 };
      if (!topicStats[topicId]) topicStats[topicId] = { correct: 0, total: 0 };

      subjectStats[subjectId].total++;
      topicStats[topicId].total++;

      if (ans.is_correct) {
        subjectStats[subjectId].correct++;
        topicStats[topicId].correct++;
      }
    }

    // Upsert SubjectPerformance using subject_id (matches schema: @@unique([user_id, subject_id]))
    for (const [subjectId, stats] of Object.entries(subjectStats)) {
       const subAccuracy = (stats.correct / stats.total) * 100;
       
       try {
         await prisma.subjectPerformance.upsert({
           where: { user_id_subject_id: { user_id, subject_id: subjectId } },
           create: {
             user_id,
             subject_id: subjectId,
             accuracy: subAccuracy,
             questions_attempted: stats.total
           },
           update: {
             accuracy: subAccuracy,
             questions_attempted: { increment: stats.total }
           }
         });
       } catch (perfErr) {
         console.warn('[Test Submit] SubjectPerformance upsert error:', perfErr.message);
       }
    }

    // Upsert WeakTopics (accuracy < 60% → high weakness_score)
    for (const [topicId, stats] of Object.entries(topicStats)) {
       const topAccuracy = (stats.correct / stats.total) * 100;
       const weaknessScore = Math.max(0, 100 - topAccuracy); // Higher = weaker
       
       try {
         if (topAccuracy < 60) {
           await prisma.weakTopic.upsert({
             where: { user_id_topic_id: { user_id, topic_id: topicId } },
             create: {
               user_id,
               topic_id: topicId,
               weakness_score: weaknessScore
             },
             update: {
               weakness_score: weaknessScore
             }
           });
         } else {
           // If they scored >= 60%, remove from weak topics
           await prisma.weakTopic.deleteMany({
             where: { user_id, topic_id: topicId }
           });
         }
       } catch (weakErr) {
         console.warn('[Test Submit] WeakTopic upsert error:', weakErr.message);
       }
    }

    res.status(201).json({ success: true, attempt });
  } catch (err) {
    console.error('[Test Submit Error]', err.message);
    next(err);
  }
});

// GET /api/tests/user/:userId — list user's tests
router.get('/user/:userId', async (req, res, next) => {
  try {
    const tests = await prisma.test.findMany({
      where: { user_id: req.params.userId },
      include: { test_attempts: { orderBy: { started_at: 'desc' }, take: 1 } },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, tests });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
