const { cache } = require('../lib/redis');

/**
 * Express middleware for caching GET responses.
 * @param {number} ttl - Cache TTL in seconds (default 300 = 5 min)
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await cache.get(key);
      if (cached) {
        return res.json({ ...cached, _cached: true });
      }
    } catch {
      // If cache fails, just continue
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache for a user's data
 */
const invalidateUserCache = async (userId) => {
  await cache.delPattern(`cache:*/api/*/${userId}*`);
};

module.exports = { cacheMiddleware, invalidateUserCache };
