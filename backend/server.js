require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const profileRoutes = require('./src/routes/profile.routes');
const timetableRoutes = require('./src/routes/timetable.routes');
const testRoutes = require('./src/routes/test.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const aiRoutes = require('./src/routes/ai.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const practiceRoutes = require('./src/routes/practice.routes');
const customTestRoutes = require('./src/routes/custom-test.routes');
const smartRevisionRoutes = require('./src/routes/smart-revision.routes');
const aiChatRoutes = require('./src/routes/ai-chat.routes');
const chatRoutes = require('./src/routes/chat.routes');
const progressRoutes = require('./src/routes/progress.routes');
const scheduleRoutes = require('./src/routes/schedule.routes');
const trackerRoutes = require('./src/routes/tracker.routes');
const resourcesRoutes = require('./src/routes/resources.routes');

// Redis & Queues
const { redis } = require('./src/lib/redis');
const { cacheMiddleware } = require('./src/middleware/cache.middleware');

// Start BullMQ workers (only if Redis is available)
require('./src/queues/workers');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Health Check ────────────────────────
app.get('/api/health', async (req, res) => {
  const redisStatus = redis ? 'connected' : 'unavailable';
  res.json({ status: 'ok', redis: redisStatus, timestamp: new Date().toISOString() });
});

// ── API Routes ──────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/analytics', cacheMiddleware(120), analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/custom-tests', customTestRoutes);
app.use('/api/smart-revision', smartRevisionRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/resources', resourcesRoutes);

// ── Global Error Handler ────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start Server ────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 PrepMind AI backend running on http://localhost:${PORT}`);
});
