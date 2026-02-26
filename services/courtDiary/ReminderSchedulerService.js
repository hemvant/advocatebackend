'use strict';

const { CaseHearing, Case, Client, OrganizationUser } = require('../../models');
const { Op } = require('sequelize');
const NotificationLogService = require('./NotificationLogService');
const { queueWhatsAppMessage } = require('../../utils/whatsappQueue');
const logger = require('../../utils/logger');

const REMINDER_1_DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_2_HOUR_MS = 2 * 60 * 60 * 1000;

/**
 * Finds hearings due for reminder (1 day and 2 hours before), sends SMS/WhatsApp, logs to notification_logs.
 * Multi-org: processes all organizations.
 */
class ReminderSchedulerService {
  static formatHearingDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /**
   * Find upcoming hearings in the next 25 hours that haven't had 1-day reminder.
   */
  static async getHearingsFor1DayReminder() {
    const now = new Date();
    const from = new Date(now.getTime() + REMINDER_1_DAY_MS - 30 * 60 * 1000);
    const to = new Date(now.getTime() + REMINDER_1_DAY_MS + 30 * 60 * 1000);
    return CaseHearing.findAll({
      where: {
        is_deleted: false,
        status: 'UPCOMING',
        hearing_date: { [Op.between]: [from, to] },
        reminder_1_day_sent: { [Op.or]: [false, null] }
      },
      include: [
        { model: Case, as: 'Case', required: true, include: [
          { model: Client, as: 'Client', attributes: ['id', 'name', 'phone'] },
          { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'phone'] }
        ]}
      ]
    });
  }

  /**
   * Find hearings in the next 2.5 hours that haven't had 2-hour reminder.
   */
  static async getHearingsFor2HourReminder() {
    const now = new Date();
    const from = new Date(now.getTime() + REMINDER_2_HOUR_MS - 15 * 60 * 1000);
    const to = new Date(now.getTime() + REMINDER_2_HOUR_MS + 15 * 60 * 1000);
    return CaseHearing.findAll({
      where: {
        is_deleted: false,
        status: 'UPCOMING',
        hearing_date: { [Op.between]: [from, to] },
        reminder_2_hour_sent: { [Op.or]: [false, null] }
      },
      include: [
        { model: Case, as: 'Case', required: true, include: [
          { model: Client, as: 'Client', attributes: ['id', 'name', 'phone'] },
          { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'phone'] }
        ]}
      ]
    });
  }

  static async sendReminder(h, type) {
    const caseTitle = h.Case?.case_title || 'Case';
    const hearingDateStr = ReminderSchedulerService.formatHearingDate(h.hearing_date);
    const courtroom = h.courtroom || '—';
    const params = [caseTitle, hearingDateStr, courtroom];
    const logPayload = {
      organizationId: h.organization_id,
      hearingId: h.id,
      notificationType: type,
      bodyPreview: `${type}: ${caseTitle} at ${hearingDateStr}`
    };

    const sendTo = (phone, channel) => {
      return NotificationLogService.log({
        ...logPayload,
        channel,
        recipient: phone,
        status: 'PENDING'
      }).then((nl) => {
        queueWhatsAppMessage(phone, 'hearing_reminder', params);
        return NotificationLogService.markSent(nl.id);
      }).catch((e) => {
        logger.warn('[ReminderScheduler] Send failed:', e.message);
      });
    };

    if (h.Case?.Assignee?.phone) await sendTo(h.Case.Assignee.phone, 'WHATSAPP');
    if (h.Case?.Client?.phone) await sendTo(h.Case.Client.phone, 'WHATSAPP');
  }

  static async run1DayReminders() {
    const hearings = await ReminderSchedulerService.getHearingsFor1DayReminder();
    for (const h of hearings) {
      await ReminderSchedulerService.sendReminder(h, 'HEARING_REMINDER_1_DAY');
      await h.update({ reminder_1_day_sent: true }).catch(() => {});
    }
    return hearings.length;
  }

  static async run2HourReminders() {
    const hearings = await ReminderSchedulerService.getHearingsFor2HourReminder();
    for (const h of hearings) {
      await ReminderSchedulerService.sendReminder(h, 'HEARING_REMINDER_2_HOUR');
      await h.update({ reminder_2_hour_sent: true }).catch(() => {});
    }
    return hearings.length;
  }
}

module.exports = ReminderSchedulerService;
