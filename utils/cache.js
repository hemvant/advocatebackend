const crypto = require('crypto');
const { getRedisClient, isRedisEnabled } = require('../config/redis');
const logger = require('./logger');

const TTL = {
  DASHBOARD: 60,
  REPORTS: 120,
  CASE_LIST: 30
};

function cacheKey(prefix, parts) {
  const str = Array.isArray(parts) ? parts.join(':') : String(parts);
  const hash = crypto.createHash('sha1').update(str).digest('hex').slice(0, 16);
  return 'al:' + prefix + ':' + hash;
}

async function get(key) {
  if (!isRedisEnabled()) return null;
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.debug('Cache get error', { key, message: err.message });
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  if (!isRedisEnabled()) return;
  ttlSeconds = ttlSeconds == null ? 60 : ttlSeconds;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    logger.debug('Cache set error', { key, message: err.message });
  }
}

async function del(key) {
  if (!isRedisEnabled()) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.del(key);
  } catch (err) {
    logger.debug('Cache del error', { key, message: err.message });
  }
}

async function delPattern(prefix) {
  if (!isRedisEnabled()) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    const keys = await redis.keys('al:' + prefix + ':*');
    if (keys.length) await redis.del(...keys);
  } catch (err) {
    logger.debug('Cache delPattern error', { prefix, message: err.message });
  }
}

module.exports = {
  TTL,
  cacheKey,
  get,
  set,
  del,
  delPattern
};
