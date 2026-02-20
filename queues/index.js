const { Queue } = require('bullmq');
const { getRedisOptions, isRedisEnabled } = require('../config/redis');

function createQueue(name, defaultJobOptions) {
  if (!isRedisEnabled()) return null;
  try {
    const opts = getRedisOptions();
    const connection = opts.url ? { url: opts.url } : { host: opts.host, port: opts.port, password: opts.password };
    return new Queue(name, {
      connection,
      defaultJobOptions: defaultJobOptions || { removeOnComplete: { count: 1000 }, attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
    });
  } catch (err) {
    return null;
  }
}

const remindersQueue = createQueue('reminders');
const emailQueue = createQueue('email');
const reportsQueue = createQueue('reports', { removeOnComplete: { count: 100 }, attempts: 2 });

module.exports = { remindersQueue, emailQueue, reportsQueue, createQueue };
