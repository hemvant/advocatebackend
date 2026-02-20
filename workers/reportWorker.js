const { Worker } = require('bullmq');
const { getRedisOptions, isRedisEnabled } = require('../config/redis');
const logger = require('../utils/logger');

function processReportJob(job) {
  const data = job.data || {};
  logger.info('Report job (stub)', { type: data.reportType, organizationId: data.organizationId });
  return Promise.resolve({ generated: true });
}

function startReportWorker() {
  if (!isRedisEnabled()) return null;
  try {
    const opts = getRedisOptions();
    const connection = opts.url ? { url: opts.url } : { host: opts.host, port: opts.port, password: opts.password };
    const worker = new Worker('reports', processReportJob, {
      connection,
      concurrency: 2
    });
    worker.on('failed', function(job, err) { logger.warn('Report job failed', { jobId: job && job.id, message: err.message }); });
    return worker;
  } catch (err) {
    logger.warn('Report worker failed to start', err.message);
    return null;
  }
}

module.exports = { startReportWorker, processReportJob };
