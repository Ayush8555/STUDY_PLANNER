const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️  Redis connection failed after 3 retries. Caching disabled.');
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('connect', () => console.log('🔴 Redis connected'));
  redis.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      console.error('Redis error:', err.message);
    }
  });
} catch (err) {
  console.warn('⚠️  Redis not available. Caching disabled.');
  redis = null;
}

// Cache helper functions
const cache = {
  async get(key) {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  async set(key, value, ttlSeconds = 300) {
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { /* silently fail */ }
  },

  async del(key) {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch { /* silently fail */ }
  },

  async delPattern(pattern) {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch { /* silently fail */ }
  },
};

module.exports = { redis, cache };
