const { Queue, Worker } = require('bullmq');
const { redis } = require('../lib/redis');

// ── Queues ──────────────────────────────
const aiQueue = new Queue('ai-tasks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

const analyticsQueue = new Queue('analytics', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 200 },
  },
});

// ── Helper: Add jobs ────────────────────
const addAIJob = async (name, data) => {
  if (!redis) {
    console.warn('⚠️  Redis unavailable, running AI job synchronously');
    return null;
  }
  return aiQueue.add(name, data);
};

const addAnalyticsJob = async (name, data) => {
  if (!redis) {
    console.warn('⚠️  Redis unavailable, skipping analytics job');
    return null;
  }
  return analyticsQueue.add(name, data);
};

module.exports = { aiQueue, analyticsQueue, addAIJob, addAnalyticsJob };
