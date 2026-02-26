'use strict';

const cron = require('node-cron');
const ReminderSchedulerService = require('../services/courtDiary/ReminderSchedulerService');
const logger = require('./logger');

async function runCourtDiaryReminders() {
  try {
    const oneDay = await ReminderSchedulerService.run1DayReminders();
    const twoHour = await ReminderSchedulerService.run2HourReminders();
    if (oneDay > 0 || twoHour > 0) {
      logger.info('[CourtDiary] Reminders sent: 1-day=' + oneDay + ', 2-hour=' + twoHour);
    }
  } catch (err) {
    logger.warn('[CourtDiary] Reminder cron error:', err.message);
  }
}

function initCourtDiaryReminderCron() {
  cron.schedule('*/15 * * * *', runCourtDiaryReminders, { scheduled: true });
  logger.info('Court diary reminder cron: every 15 minutes');
}

module.exports = { initCourtDiaryReminderCron, runCourtDiaryReminders };
