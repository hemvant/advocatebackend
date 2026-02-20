require('dotenv').config();
function getRedisOptions() {
  var url = process.env.REDIS_URL || 'redis://localhost:6379';
  if (process.env.REDIS_URL) return { maxRetriesPerRequest: null, url: url };
  return {
    maxRetriesPerRequest: null,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  };
}
var client = null;
async function getRedisClient() {
  if (client) return client;
  try {
    var Redis = require('ioredis');
    var opts = getRedisOptions();
    client = opts.url ? new Redis(opts.url, { maxRetriesPerRequest: null }) : new Redis(opts);
    client.on('error', function(err) {
      try { require('../utils/logger').warn('Redis client error:', err.message); } catch (_) {}
    });
    return client;
  } catch (err) {
    return null;
  }
}
function isRedisEnabled() {
  return process.env.REDIS_ENABLED !== 'false';
}
module.exports = { getRedisClient, getRedisOptions, isRedisEnabled, redisUrl: process.env.REDIS_URL || 'redis://localhost:6379' };
