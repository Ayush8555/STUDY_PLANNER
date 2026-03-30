const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');
const aiService = require('../services/ai.service');

// All routes require authentication
router.use(authMiddleware);

// ─── POST /api/custom-tests/generate ─────────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    console.log('[Custom Test] Incoming request body:', JSON.stringify(req.body, null, 2));
    const userId = req.user.userId;
    const {
      subject = '',
      chat_message = '',
      difficulty = 'medium',
      test_type = '',
      ai_suggestion = ''
    } = req.body;

    const number_of_questions = parseInt(req.body.number_of_questions, 10) || 20;
    const duration_minutes = parseInt(req.body.duration, 10) || parseInt(req.body.duration_minutes, 10) || 30;

    let aiQuestions = [];
    let testSubject = subject.trim();
    let testChapter = null;
    let testTopic = chat_message.trim();
    let testClass = null;
    let aiTestRaw = null;

    // Fetch user's target exam for goal-based question generation
    let targetExam = '';
    try {
      const profile = await prisma.studentProfile.findUnique({
        where: { user_id: userId },
        include: { exam: true }
      });
      if (profile?.exam?.name) {
        targetExam = profile.exam.name;
      } else {
        // Fallback: check onboarding data
        const onboarding = await prisma.onboarding.findUnique({ where: { user_id: userId } });
        if (onboarding?.target_exam) targetExam = onboarding.target_exam;
      }
      // Also check user.goal field as last fallback
      if (!targetExam) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { goal: true } });
        if (user?.goal) targetExam = user.goal;
      }
    } catch (e) {
      console.warn('[Custom Test] Could not fetch user exam profile:', e.message);
    }
    console.log(`[Custom Test] Target exam resolved: ${targetExam || 'Generic'}`);

    // ─── NCERT Flow ────────────────────────────────────────
    if (test_type === 'ncert') {
      const { ncert_subject, ncert_classes, ncert_chapters } = req.body;

      if (!ncert_subject || !ncert_classes?.length || !ncert_chapters?.length) {
        return res.status(400).json({ success: false, message: 'NCERT tests require subject, at least one class, and at least one chapter.' });
      }

      console.log(`[Custom Test] NCERT mode: ${ncert_subject}, Classes: ${ncert_classes}, Chapters: ${ncert_chapters.length}`);

      const aiTest = await aiService.generateNCERTQuestions({
        subject: ncert_subject,
        classes: ncert_classes,
        chapters: ncert_chapters,
        difficulty,
        count: number_of_questions,
        targetExam,
        studentInstruction: ai_suggestion.trim()
      });

      aiQuestions = aiTest.questions || [];
      testSubject = ncert_subject;
      testChapter = ncert_chapters.join(', ');
      testTopic = `NCERT ${ncert_subject} - Class ${ncert_classes.join(', ')}`;
      testClass = ncert_classes.join(', ');
      aiTestRaw = aiTest;

    // ─── Standard Flow ─────────────────────────────────────
    } else {
      if (!subject.trim() || !chat_message.trim()) {
        return res.status(400).json({ success: false, message: 'Please provide both subject and chat message.' });
      }

      // Step 1: Parse Topic
      console.log(`[Custom Test] Parsing topic...`);
      const parsedTopic = await aiService.parseTestTopic(chat_message);
      console.log(`[Custom Test] Parsed topic:`, parsedTopic);

      // Step 2: Generate Questions
      console.log(`[Custom Test] Generating test...`);
      const aiTest = await aiService.generateQuestions({
        class_level: parsedTopic.class || '',
        subject: parsedTopic.subject || subject.trim(),
        chapter: parsedTopic.chapter || '',
        topic: parsedTopic.topic || chat_message.trim(),
        difficulty,
        count: number_of_questions,
        targetExam,
        studentInstruction: ai_suggestion.trim()
      });

      aiQuestions = aiTest.questions || [];
      testSubject = parsedTopic.subject || subject.trim();
      testChapter = parsedTopic.chapter || null;
      testTopic = parsedTopic.topic || chat_message.trim();
      testClass = parsedTopic.class || null;
      aiTestRaw = aiTest;
    }

    console.log(`[Custom Test] AI returned ${aiQuestions.length} questions`);
    if (!aiQuestions || aiQuestions.length === 0) {
       return res.status(500).json({ success: false, message: 'AI returned empty test. Please try again.' });
    }

    // Step 3: Save to DB (custom_tests schema)
    const customTest = await prisma.customTest.create({
      data: {
        user_id: userId,
        subject: testSubject,
        class: testClass,
        chapter: testChapter,
        topic: testTopic,
        difficulty,
        num_questions: aiQuestions.length,
        duration_minutes: duration_minutes || aiTestRaw?.duration_minutes || 30,
      }
    });

    console.log("Saving test:", customTest.id);

    for (let i = 0; i < aiQuestions.length; i++) {
      const q = aiQuestions[i];
      const questionText = q.question_text || '';
      if (!questionText) { continue; }
      
      const optA = q.options && q.options[0] ? (q.options[0].text || q.options[0].option_text || '') : '';
      const optB = q.options && q.options[1] ? (q.options[1].text || q.options[1].option_text || '') : '';
      const optC = q.options && q.options[2] ? (q.options[2].text || q.options[2].option_text || '') : '';
      const optD = q.options && q.options[3] ? (q.options[3].text || q.options[3].option_text || '') : '';

      let correctAns = q.correct_answer || 'A';
      // Fallback if AI marked correct via boolean flag
      const correctOpt = (q.options || []).find(o => o.is_correct);
      if (correctOpt && correctOpt.label) {
        correctAns = correctOpt.label;
      }

      await prisma.customTestQuestion.create({
        data: {
          test_id: customTest.id,
          question_text: questionText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_answer: correctAns,
          explanation: q.explanation || null,
          difficulty: q.difficulty || difficulty
        }
      });
    }

    // Save AI Log (table 5)
    await prisma.customTestAILog.create({
      data: {
        test_id: customTest.id,
        prompt_used: test_type === 'ncert' ? `NCERT: ${testTopic}` : chat_message,
        ai_response: JSON.stringify(aiTestRaw)
      }
    });

    // Step 4 & 5: Return test_id
    console.log(`[Custom Test] Test ${customTest.id} created successfully.`);
    res.status(201).json({
      success: true,
      testId: customTest.id,
      message: `Test generated with ${aiQuestions.length} questions`
    });
  } catch (err) {
    console.error('[Custom Test Generate Error]', err.message, err.stack);
    res.status(500).json({
      success: false,
      message: 'Test generation failed',
      error: err.message
    });
  }
});

// ─── GET /api/custom-tests ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const tests = await prisma.customTest.findMany({
      where: { user_id: userId },
      include: {
        attempts: {
          orderBy: { submitted_at: 'desc' },
          take: 1
        },
        _count: { select: { questions: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, tests });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/custom-tests/history ──────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // user_id is passed implicitly via authMiddleware, but we handle query if provided
    const targetUserId = req.query.user_id || userId;
    
    console.log("Fetching history:", targetUserId);

    const attempts = await prisma.customTestAttempt.findMany({
      where: { user_id: targetUserId },
      include: {
        test: true
      },
      orderBy: { submitted_at: 'desc' }
    });

    const historyData = attempts.map(attempt => ({
      test_id: attempt.test.id,
      attempt_id: attempt.id,
      subject: attempt.test.subject,
      topic: attempt.test.topic,
      score: attempt.score,
      accuracy: attempt.accuracy,
      total_questions: attempt.test.num_questions,
      date: attempt.submitted_at
    }));

    console.log(`[Custom Test] Fetching history:`, targetUserId, `found ${historyData.length} records`);

    res.json({ success: true, history: historyData });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/custom-tests/:testId ───────────────────────────────
router.get('/:testId', async (req, res, next) => {
  try {
    const test = await prisma.customTest.findUnique({
      where: { id: req.params.testId },
      include: {
        questions: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    // Map questions to the format frontend expects if necessary
    const mappedQuestions = test.questions.map((q, idx) => ({
      id: q.id,
      question_text: q.question_text,
      question_order: idx + 1,
      options: [
        { id: 'A', option_label: 'A', option_text: q.option_a },
        { id: 'B', option_label: 'B', option_text: q.option_b },
        { id: 'C', option_label: 'C', option_text: q.option_c },
        { id: 'D', option_label: 'D', option_text: q.option_d },
      ].filter(o => o.option_text)
    }));

    res.json({ success: true, test: { ...test, questions: mappedQuestions } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/custom-tests/:testId/submit ───────────────────────
router.post('/:testId/submit', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const testId = req.params.testId;
    const { answers, time_taken_seconds } = req.body;
    // answers: [{ question_id, selected_option_id }] (frontend sends 'A', 'B', etc. as selected_option_id)

    const questions = await prisma.customTestQuestion.findMany({
      where: { test_id: testId }
    });

    let correctCount = 0;
    const answerRecords = (answers || []).map(a => {
      const q = questions.find(q => q.id === a.question_id);
      const isCorrect = q ? (q.correct_answer === a.selected_option_id) : false;
      if (isCorrect) correctCount++;
      return {
        question_id: a.question_id,
        selected_option: a.selected_option_id || null,
        is_correct: isCorrect
      };
    });

    const totalQ = questions.length > 0 ? questions.length : 1;
    const accuracy = parseFloat(((correctCount / totalQ) * 100).toFixed(2));

    const attempt = await prisma.customTestAttempt.create({
      data: {
        test_id: testId,
        user_id: userId,
        score: correctCount,
        accuracy: accuracy,
        time_taken: time_taken_seconds || null,
        answers: { create: answerRecords }
      }
    });

    console.log("Saving attempt:", userId);

    try {
      const gQuestions = questions.map(q => q.question_text);
      const gStudentAnswers = answerRecords.map(a => a.selected_option || 'Skipped');
      const gCorrectAnswers = questions.map(q => q.correct_answer);

      const aiAnalytics = await aiService.generateTestAnalysis({
        questions: gQuestions,
        studentAnswers: gStudentAnswers,
        correctAnswers: gCorrectAnswers
      });

      await prisma.customTestAnalysis.create({
        data: {
          attempt_id: attempt.id,
          weak_topics: aiAnalytics.weak_topics || [],
          strong_topics: aiAnalytics.strong_topics || [],
          improvement_suggestions: (aiAnalytics.revision_suggestions || aiAnalytics.improvement_suggestions) || [],
          ai_feedback: `Accuracy: ${aiAnalytics.accuracy}%`
        }
      });
      console.log(`[Custom Test] AI Analysis saved for attempt ${attempt.id}`);
    } catch (analysisErr) {
      console.error('[Custom Test] Failed to generate AI analysis:', analysisErr.message);
    }

    res.status(201).json({
      success: true,
      attempt: {
        id: attempt.id,
        score: correctCount,
        total_questions: totalQ,
        accuracy: accuracy,
        time_taken_seconds
      }
    });
  } catch (err) {
    console.error('[Custom Test Submit Error]', err.message);
    next(err);
  }
});

// ─── GET /api/custom-tests/:testId/analysis ──────────────────────
router.get('/:testId/analysis', async (req, res, next) => {
  try {
    const testId = req.params.testId;

    const test = await prisma.customTest.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { created_at: 'asc' }
        },
        attempts: {
          orderBy: { submitted_at: 'desc' },
          take: 1,
          include: {
            answers: true,
            analysis: true,
            study_plan: true
          }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const latestAttempt = test.attempts[0] || null;

    const mappedQuestions = test.questions.map((q, idx) => ({
      ...q,
      question_order: idx + 1,
      options: [
        { id: 'A', option_label: 'A', option_text: q.option_a, is_correct: q.correct_answer === 'A' },
        { id: 'B', option_label: 'B', option_text: q.option_b, is_correct: q.correct_answer === 'B' },
        { id: 'C', option_label: 'C', option_text: q.option_c, is_correct: q.correct_answer === 'C' },
        { id: 'D', option_label: 'D', option_text: q.option_d, is_correct: q.correct_answer === 'D' }
      ].filter(o => o.option_text),
      explanations: q.explanation ? [{ explanation: q.explanation }] : []
    }));

    res.json({
      success: true,
      test: {
        id: test.id,
        topic: test.topic,
        difficulty: test.difficulty,
        num_questions: test.num_questions,
        created_at: test.created_at,
        subject: test.subject
      },
      questions: mappedQuestions,
      attempt: latestAttempt ? {
        id: latestAttempt.id,
        score: latestAttempt.score,
        total_questions: test.questions.length,
        accuracy: latestAttempt.accuracy,
        time_taken_seconds: latestAttempt.time_taken,
        submitted_at: latestAttempt.submitted_at,
        answers: latestAttempt.answers,
        analysis: latestAttempt.analysis || null,
        study_plan: latestAttempt.study_plan || null
      } : null
    });
  } catch (err) {
    next(err);
  }
});
// ─── POST /api/custom-tests/:testId/study-plan ─────────────────
router.post('/:testId/study-plan', async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const userId = req.user.userId;

    // Fetch the test and its latest attempt
    const test = await prisma.customTest.findUnique({
      where: { id: testId },
      include: {
        attempts: {
          orderBy: { submitted_at: 'desc' },
          take: 1,
          include: {
            study_plan: true,
            analysis: true,
            answers: { include: { question: true } }
          }
        }
      }
    });

    if (!test || test.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Test not found or unauthorized.' });
    }

    const latestAttempt = test.attempts[0];
    if (!latestAttempt) {
      return res.status(400).json({ success: false, message: 'No attempt found to analyze.' });
    }

    // Return cached plan if it exists
    if (latestAttempt.study_plan) {
      return res.json({ success: true, plan: latestAttempt.study_plan });
    }

    // Aggregate data for the AI
    const testData = {
      subject: test.subject,
      topic: test.topic,
      difficulty: test.difficulty,
      total_questions: test.num_questions,
      correct: latestAttempt.score,
      incorrect: test.num_questions - latestAttempt.score,
      accuracy: latestAttempt.accuracy,
      time_taken_seconds: latestAttempt.time_taken,
      weak_topics: latestAttempt.analysis?.weak_topics || "Not determined",
      strong_topics: latestAttempt.analysis?.strong_topics || "Not determined",
      overall_feedback: latestAttempt.analysis?.ai_feedback || "",
      questions_review: latestAttempt.answers.map(a => ({
        question: a.question.question_text,
        user_answer: a.selected_option,
        correct_answer: a.question.correct_answer,
        is_correct: a.selected_option === a.question.correct_answer
      }))
    };

    const aiPlanJSON = await aiService.generateStudyPlan(testData);

    const newPlan = await prisma.customTestStudyPlan.create({
      data: {
        attempt_id: latestAttempt.id,
        overall_level: aiPlanJSON.overall_level || "intermediate",
        performance_summary: aiPlanJSON.performance_summary || "Good effort.",
        weak_topics_analysis: aiPlanJSON.weak_topics_analysis || [],
        strong_areas: aiPlanJSON.strong_areas || [],
        study_strategy: aiPlanJSON.study_strategy || [],
        revision_plan: aiPlanJSON.revision_plan || [],
        practice_strategy: aiPlanJSON.practice_strategy || [],
        time_management: aiPlanJSON.time_management || [],
        mistake_analysis: aiPlanJSON.mistake_analysis || [],
        weekly_plan: aiPlanJSON.weekly_plan || [],
        ai_advice: aiPlanJSON.ai_advice || "Keep practicing!",
        suggested_hours: parseFloat(aiPlanJSON.suggested_hours) || 2.0,
        next_test_topic: aiPlanJSON.next_test_topic || null,
        next_test_date: aiPlanJSON.next_test_date ? new Date(aiPlanJSON.next_test_date) : null,
        improvement_timeline: aiPlanJSON.improvement_timeline || "2 weeks"
      }
    });

    res.json({ success: true, plan: newPlan });
  } catch (err) {
    console.error('[Study Plan Gen Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
