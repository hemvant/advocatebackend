const { Worker } = require('bullmq');
const { getRedisOptions, isRedisEnabled } = require('../config/redis');
const logger = require('../utils/logger');

function processEmailJob(job) {
  var data = job.data || {};
  logger.info('Email job (stub)', { to: data.to, subject: data.subject });
  return Promise.resolve();
}

function startEmailWorker() {
  if (!isRedisEnabled()) return null;
  try {
    var opts = getRedisOptions();
    var connection = opts.url ? { url: opts.url } : { host: opts.host, port: opts.port, password: opts.password };
    var worker = new Worker('email', processEmailJob, { connection: connection, concurrency: 5 });
    worker.on('failed', function(job, err) { logger.warn('Email job failed', { message: err.message }); });
    return worker;
  } catch (err) {
    logger.warn('Email worker failed to start', err.message);
    return null;
  }
}

module.exports = { startEmailWorker: startEmailWorker, processEmailJob: processEmailJob };
