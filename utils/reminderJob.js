const cron = require('node-cron');
const { HearingReminder, CaseHearing } = require('../models');
const { Op } = require('sequelize');

function runReminderJob() {
  const now = new Date();
  HearingReminder.findAll({
    where: {
      reminder_time: { [Op.lte]: now },
      is_sent: false
    }
  }).then((reminders) => {
    if (reminders.length === 0) return;
    reminders.forEach((r) => {
      console.log(`[Reminder] hearing_id=${r.hearing_id} reminder_time=${r.reminder_time} type=${r.reminder_type} (simulated send)`);
    });
    const ids = reminders.map((r) => r.id);
    const hearingIds = [...new Set(reminders.map((r) => r.hearing_id).filter(Boolean))];
    return HearingReminder.update({ is_sent: true }, { where: { id: { [Op.in]: ids } } })
      .then(() => {
        if (hearingIds.length) {
          return CaseHearing.update({ reminder_sent: true }, { where: { id: { [Op.in]: hearingIds } } });
        }
      })
      .catch((err) => console.error('[Reminder] Error:', err.message));
  }).catch((err) => console.error('[Reminder] Error:', err.message));
}

function initReminderCron() {
  cron.schedule('*/5 * * * *', runReminderJob, { scheduled: true });
  console.log('Reminder cron: every 5 minutes');
}

module.exports = { initReminderCron, runReminderJob };
