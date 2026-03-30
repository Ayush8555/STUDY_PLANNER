const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/timetable/:userId — get latest timetable
router.get('/:userId', async (req, res, next) => {
  try {
    const timetable = await prisma.timetable.findFirst({
      where: { user_id: req.params.userId },
      orderBy: { created_at: 'desc' },
      include: {
        slots: {
          include: { chapter: { include: { topic: { include: { subject: true } } } } },
          orderBy: [{ scheduled_date: 'asc' }, { start_time: 'asc' }],
        },
      },
    });

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'No timetable found' });
    }

    res.json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
});

// POST /api/timetable — create a new timetable with slots
router.post('/', async (req, res, next) => {
  try {
    const { user_id, slots } = req.body;

    const timetable = await prisma.timetable.create({
      data: {
        user_id,
        slots: {
          create: slots.map((slot) => ({
            chapter_id: slot.chapter_id,
            scheduled_date: new Date(slot.scheduled_date),
            start_time: new Date(`1970-01-01T${slot.start_time}`),
            end_time: new Date(`1970-01-01T${slot.end_time}`),
            task_type: slot.task_type,
          })),
        },
      },
      include: { slots: true },
    });

    res.status(201).json({ success: true, timetable });
  } catch (err) {
    next(err);
  }
});

// POST /api/timetable/study-session — log a study session
router.post('/study-session', async (req, res, next) => {
  try {
    const { user_id, chapter_id, start_time, end_time, duration_minutes } = req.body;

    const session = await prisma.studySession.create({
      data: {
        user_id,
        chapter_id,
        start_time: new Date(start_time),
        end_time: end_time ? new Date(end_time) : null,
        duration_minutes,
      },
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

// GET /api/timetable/:userId/study-sessions — get study hours history
router.get('/:userId/study-sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.studySession.findMany({
      where: { user_id: req.params.userId },
      include: { chapter: { include: { topic: { include: { subject: true } } } } },
      orderBy: { start_time: 'desc' },
      take: 50,
    });

    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
