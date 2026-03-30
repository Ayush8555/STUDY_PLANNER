const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const aiService = require('../services/ai.service');
const authMiddleware = require('../middleware/auth.middleware');

// GET /api/practice/setup
// Returns syllabus hierarchy and recommended topics for the user
router.get('/setup', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get user profile
    const profile = await prisma.studentProfile.findUnique({
      where: { user_id: userId },
      include: { exam: true },
    });

    // Fetch complete syllabus hierarchy for the user's exam (or all if not set)
    const whereClause = profile && profile.exam_id ? { exam_id: profile.exam_id } : {};
    
    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        topics: {
          include: {
            chapters: true
          }
        }
      }
    });

    console.log("====== API DEBUG ======");
    console.log("Profile resolved:", profile ? "YES" : "NO");
    console.log("WhereClause used:", whereClause);
    console.log("Fetched Subjects:", subjects.length);
    console.log("=======================");

    // Fetch user's weak topics to generate "Recommended For You"
    const weakTopics = await prisma.weakTopic.findMany({
      where: { user_id: userId },
      orderBy: { weakness_score: 'desc' },
      take: 3,
      include: { topic: { include: { subject: true } } }
    });

    // We can map this to a recommended chapter if available
    let recommendedChapter = null;
    if (weakTopics.length > 0 && weakTopics[0].topic) {
      recommendedChapter = weakTopics[0].topic.name; 
    } else {
       // If no weak topics, recommend a random chapter from their first subject
       if (subjects.length > 0 && subjects[0].topics.length > 0 && subjects[0].topics[0].chapters.length > 0) {
          recommendedChapter = subjects[0].topics[0].chapters[0].name;
       }
    }

    res.json({
      success: true,
      setup: {
        recommendedChapter,
        subjects,
        examName: profile?.exam?.name || 'Your Target Exam'
      }
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/practice/recent
// Returns the user's recent practice test attempts for the dashboard
router.get('/recent', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const recentAttempts = await prisma.practiceStudentAttempt.findMany({
      where: { user_id: userId },
      orderBy: { started_at: 'desc' },
      take: 4,
      include: {
        test: true,
        result: true
      }
    });

    const formattedRecent = recentAttempts.map(att => {
      return {
        id: att.id,
        test_id: att.test_id,
        subject: att.test.subject_id || att.test.topic_requested?.split(',')[0] || 'General',
        test_name: att.test.topic_requested,
        date: att.started_at,
        accuracy: att.accuracy_percentage,
        score: att.correct_answers,
        total_questions: att.total_questions,
        time_taken_seconds: att.result?.total_time_seconds || 0
      };
    });

    res.json({
      success: true,
      recent: formattedRecent
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/practice/generate
// Generates a new practice test based on selected chapters/subjects
// ALL data now stored in practice_tests.* schema
router.post('/generate', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { chapterIds, subjectId, topicNames, mode, difficulty = 'medium', numQuestions = 10, totalMinutes = 45 } = req.body;

    let allGeneratedQuestions = [];
    let resolvedSubjectName = 'General';
    let resolvedSubjectId = subjectId || null;
    let topicForTest = '';

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
        const onboarding = await prisma.onboarding.findUnique({ where: { user_id: userId } });
        if (onboarding?.target_exam) targetExam = onboarding.target_exam;
      }
      if (!targetExam) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { goal: true } });
        if (user?.goal) targetExam = user.goal;
      }
    } catch (e) {
      console.warn('[Practice] Could not fetch user exam profile:', e.message);
    }
    console.log(`[Practice] Target exam resolved: ${targetExam || 'Generic'}`);

    // Strategy 1: If chapterIds are provided and valid, use them
    if (chapterIds && chapterIds.length > 0) {
      const chapters = await prisma.chapter.findMany({
        where: { id: { in: chapterIds } },
        include: { topic: { include: { subject: true } } }
      });

      if (chapters.length > 0) {
        resolvedSubjectName = chapters[0].topic.subject.name;
        resolvedSubjectId = chapters[0].topic.subject.id;
        const chapterNamesArr = chapters.map(ch => ch.name);
        topicForTest = chapterNamesArr.join(', ');

        // Create a single AI call requesting questions randomly distributed across all selected chapters
        const aiQs = await aiService.generateQuestions({
          subject: resolvedSubjectName,
          topic: `Mix of topics: ${topicForTest.substring(0, 500)}${topicForTest.length > 500 ? '...' : ''}`,
          difficulty,
          count: numQuestions,
          targetExam
        });
        
        // Map the generated questions, trying to preserve chapter context if possible
        const taggedQs = aiQs.map(q => ({ ...q, _chapterName: 'Mixed Practice', _subjectName: resolvedSubjectName }));
        allGeneratedQuestions = allGeneratedQuestions.concat(taggedQs);
      }
    }

    // Strategy 2: If no chapters found/provided, generate from subject name directly
    if (allGeneratedQuestions.length === 0 && subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      resolvedSubjectName = subject.name;
      resolvedSubjectId = subject.id;

      // Use provided topicNames or the subject name itself
      const topicsToGenerate = (topicNames && topicNames.length > 0) ? topicNames : [subject.name];
      topicForTest = topicsToGenerate.join(', ');

      const aiQs = await aiService.generateQuestions({
        subject: subject.name,
        topic: `Mix of topics: ${topicForTest.substring(0, 500)}${topicForTest.length > 500 ? '...' : ''}`,
        difficulty,
        count: numQuestions,
        targetExam
      });
      const taggedQs = aiQs.map(q => ({ ...q, _chapterName: 'Mixed Practice', _subjectName: subject.name }));
      allGeneratedQuestions = allGeneratedQuestions.concat(taggedQs);
    }

    if (allGeneratedQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not generate questions. Please select a subject or topics.' });
    }

    // Slice to exact requested amount
    allGeneratedQuestions = allGeneratedQuestions.slice(0, numQuestions);

    // 1. Create the practice test in practice_tests.tests
    const practiceTest = await prisma.practiceTest.create({
      data: {
        user_id: userId,
        subject_id: resolvedSubjectId,
        topic_requested: topicForTest || resolvedSubjectName,
        chapter_requested: topicForTest || null,
        difficulty_level: difficulty,
        number_of_questions: allGeneratedQuestions.length,
        duration_minutes: totalMinutes,
        status: 'created',
        ai_generated: true
      }
    });

    // 2. Save questions, options, and explanations to practice_tests schema
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < allGeneratedQuestions.length; i++) {
      const q = allGeneratedQuestions[i];

      const createdQuestion = await prisma.practiceQuestion.create({
        data: {
          test_id: practiceTest.id,
          question_text: q.question_text,
          subject: q._subjectName || resolvedSubjectName,
          chapter: q._chapterName || null,
          difficulty: q.difficulty || difficulty,
          concept_tested: q.concept_tested || null,
          question_order: i + 1,
          options: {
            create: (q.options || []).map((opt, idx) => ({
              option_label: labels[idx] || `${idx + 1}`,
              option_text: opt.option_text,
              is_correct: opt.is_correct || false
            }))
          }
        }
      });

      // Save explanation in practice_tests.question_explanations
      if (q.explanation) {
        await prisma.practiceQuestionExplanation.create({
          data: {
            question_id: createdQuestion.id,
            explanation: q.explanation,
            ai_generated: true
          }
        });
      }
    }

    // 3. Update status
    await prisma.practiceTest.update({
      where: { id: practiceTest.id },
      data: { status: 'in_progress' }
    });

    res.json({
      success: true,
      testId: practiceTest.id,
      message: `Test generated with ${allGeneratedQuestions.length} questions`
    });

  } catch (err) {
    console.error("[Practice Generate Error]", err.message);
    next(err);
  }
});

module.exports = router;
