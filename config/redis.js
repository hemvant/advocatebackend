require('dotenv').config();

function getRedisOptions() {
  // If full REDIS_URL provided (like production)
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null
    };
  }

  // Default Docker-safe config
  return {
    host: process.env.REDIS_HOST || 'redis',   // ← important change
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null
  };
}

let client = null;

async function getRedisClient() {
  if (!isRedisEnabled()) return null;

  if (client) return client;

  try {
    const Redis = require('ioredis');
    const opts = getRedisOptions();

    client = opts.url
      ? new Redis(opts.url, { maxRetriesPerRequest: null })
      : new Redis(opts);

    client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    client.on('error', (err) => {
      try {
        require('../utils/logger').warn('Redis error:', err.message);
      } catch (_) {}
    });

    return client;
  } catch (err) {
    console.error('❌ Redis initialization failed:', err.message);
    return null;
  }
}

function isRedisEnabled() {
  return process.env.REDIS_ENABLED !== 'false';
}

module.exports = {
  getRedisClient,
  getRedisOptions,
  isRedisEnabled
};