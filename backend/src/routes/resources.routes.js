const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /api/resources
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { goal } = req.query;

    let targetGoal = goal;

    // If no goal is explicitly provided, fetch user's goal
    if (!targetGoal) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { goal: true }
      });
      targetGoal = user?.goal || 'UPSC'; // fallback
    }

    // Validate goal
    const validGoals = ['UPSC', 'JEE', 'NEET', 'SSC', 'Other'];
    if (!validGoals.includes(targetGoal)) {
      return res.status(400).json({ success: false, message: 'Invalid goal' });
    }

    // Fetch resources
    const resources = await prisma.resource.findMany({
      where: { goal: targetGoal },
      orderBy: [
        { subject: 'asc' },
        { class_level: 'asc' },
        { created_at: 'asc' }
      ]
    });

    res.json({ success: true, goal: targetGoal, resources });

  } catch (err) {
    console.error('[Resources] Error fetching resources:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch resources' });
  }
});

module.exports = router;
