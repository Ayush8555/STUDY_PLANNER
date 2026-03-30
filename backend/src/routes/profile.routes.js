const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { user_id: req.user.userId },
      include: { exam: { include: { subjects: { include: { topics: { include: { chapters: { include: { subtopics: true } } } } } } } } },
    });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

// POST /api/profile — Onboarding (loads syllabus from DB, never generates)
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { target_exam, student_type, class_level, subjects, hours_per_day, exam_date } = req.body;

    // Map onboarding key to exam name in DB
    const examNames = {
      upsc: 'UPSC', jee: 'JEE (Main & Advanced)', neet: 'NEET',
      ssc_cgl: 'SSC CGL', gate: 'GATE',
    };
    const examName = examNames[target_exam] || target_exam;

    // Find the pre-seeded exam
    let exam = await prisma.exam.findFirst({ where: { name: examName } });
    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          name: examName,
          description: `Auto-generated for ${examName}`
        }
      });
    }

    // Upsert profile
    const profile = await prisma.studentProfile.upsert({
      where: { user_id: userId },
      update: { exam_id: exam.id, student_type, class_level, target_exam_date: exam_date ? new Date(exam_date) : null },
      create: { user_id: userId, exam_id: exam.id, student_type, class_level, target_exam_date: exam_date ? new Date(exam_date) : null },
      include: { exam: true },
    });

    // Upsert Onboarding table directly
    await prisma.onboarding.upsert({
      where: { user_id: userId },
      update: { target_exam, student_type, class_level, hours_per_day, subjects, exam_date: exam_date ? new Date(exam_date) : null },
      create: { user_id: userId, target_exam, student_type, class_level, hours_per_day, subjects, exam_date: exam_date ? new Date(exam_date) : null },
    });

    // Init streak
    await prisma.studyStreak.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, current_streak: 0, longest_streak: 0 },
    });

    // Map goal for Student Resources compatibility
    let userGoal = 'Other';
    if (examName === 'UPSC') userGoal = 'UPSC';
    else if (examName.includes('JEE')) userGoal = 'JEE';
    else if (examName.includes('NEET')) userGoal = 'NEET';
    else if (examName.includes('SSC')) userGoal = 'SSC';

    // Mark user explicitly as onboarded and save goal
    await prisma.user.update({
      where: { id: userId },
      data: { is_onboarded: true, goal: userGoal }
    });

    // Load syllabus from DB
    const syllabus = await prisma.subject.findMany({
      where: { exam_id: exam.id },
      include: { topics: { include: { chapters: { include: { subtopics: true } } } } },
      orderBy: { name: 'asc' },
    });

    let totalT = 0, totalC = 0;
    syllabus.forEach(s => { s.topics.forEach(t => { totalT++; totalC += t.chapters.length; }); });

    res.status(201).json({
      success: true,
      profile,
      syllabus: { source: 'database', totalSubjects: syllabus.length, totalTopics: totalT, totalChapters: totalC, subjects: syllabus },
      onboarding: { target_exam, student_type, class_level, subjects, hours_per_day, exam_date },
    });
  } catch (err) {
    console.error('Profile error:', err);
    next(err);
  }
});

// PUT /api/profile/:userId
router.put('/:userId', async (req, res, next) => {
  try {
    const { exam_id, student_type, class_level, target_exam_date } = req.body;
    const profile = await prisma.studentProfile.update({
      where: { user_id: req.params.userId },
      data: { exam_id, student_type, class_level, target_exam_date: target_exam_date ? new Date(target_exam_date) : null },
      include: { exam: true },
    });
    res.json({ success: true, profile });
  } catch (err) { next(err); }
});

module.exports = router;
