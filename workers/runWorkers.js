require('dotenv').config();
require('../models');
const { startReminderWorker } = require('./reminderWorker');
const { startEmailWorker } = require('./emailWorker');
const { startReportWorker } = require('./reportWorker');
const logger = require('../utils/logger');

const workers = [];
if (startReminderWorker()) workers.push('reminders');
if (startEmailWorker()) workers.push('email');
if (startReportWorker()) workers.push('reports');

logger.info('Workers started: ' + (workers.length ? workers.join(', ') : 'none (Redis required)'));

if (workers.length === 0) {
  logger.warn('No Redis connection; workers exiting.');
  process.exit(0);
}

process.on('SIGTERM', function() { process.exit(0); });
