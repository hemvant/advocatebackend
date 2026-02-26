'use strict';

const { AiConfig } = require('../models');

const store = new Map();
const WINDOW_MS = 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (data.expiry < now) store.delete(key);
  }
}
setInterval(cleanup, 60000);

/**
 * Per-user per-minute rate limit. Limit from ai_config (rate_limit_per_user_per_min).
 */
async function aiRateLimitMiddleware(req, res, next) {
  if (!req.user) return next();
  const userId = req.user.id;
  const orgId = req.user.organization_id;
  const config = await AiConfig.findOne({ where: { is_active: true } });
  const limit = config ? config.rate_limit_per_user_per_min : 10;
  const key = `u:${orgId}:${userId}`;
  const now = Date.now();
  let data = store.get(key);
  if (!data || data.expiry < now) {
    data = { count: 0, expiry: now + WINDOW_MS };
    store.set(key, data);
  }
  data.count++;
  if (data.count > limit) {
    return res.status(429).json({
      success: false,
      message: `AI rate limit exceeded. Max ${limit} requests per minute.`
    });
  }
  next();
}

module.exports = { aiRateLimitMiddleware };
