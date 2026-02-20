const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const { HearingReminder, CaseHearing } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

function processReminderJob(job) {
  return HearingReminder.findAll({
    where: { reminder_time: { [Op.lte]: new Date() }, is_sent: false }
  }).then(function(reminders) {
    if (reminders.length === 0) return null;
    const ids = reminders.map(function(r) { return r.id; });
    const hearingIds = [...new Set(reminders.map(function(r) { return r.hearing_id; }).filter(Boolean))];
    return HearingReminder.update({ is_sent: true }, { where: { id: { [Op.in]: ids } } })
      .then(function() {
        if (hearingIds.length) return CaseHearing.update({ reminder_sent: true }, { where: { id: { [Op.in]: hearingIds } } });
      });
  }).catch(function(err) { logger.warn('Reminder worker error', err.message); return null; });
}

function startReminderWorker() {
  if (!redisConfig.isRedisEnabled()) return null;
  try {
    const opts = redisConfig.getRedisOptions();
    const conn = opts.url ? { url: opts.url } : { host: opts.host, port: opts.port, password: opts.password };
    return new Worker('reminders', processReminderJob, { connection: conn, concurrency: 1 });
  } catch (err) {
    logger.warn('Reminder worker start failed', err.message);
    return null;
  }
}

module.exports = { startReminderWorker, processReminderJob };
