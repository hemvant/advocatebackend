'use strict';

const { NotificationLog } = require('../../models');

/**
 * Logs all court-diary notifications (SMS, WhatsApp, etc.) for audit and debugging.
 * Multi-org: every log is scoped by organization_id.
 */
class NotificationLogService {
  /**
   * @param {Object} opts
   * @param {number} opts.organizationId
   * @param {number} [opts.hearingId]
   * @param {string} opts.notificationType - e.g. 'HEARING_REMINDER_1_DAY', 'HEARING_REMINDER_2_HOUR', 'RESCHEDULE_NOTIFY'
   * @param {string} opts.channel - SMS | WHATSAPP | EMAIL | SYSTEM
   * @param {string} [opts.recipient]
   * @param {string} [opts.subject]
   * @param {string} [opts.bodyPreview]
   * @param {string} [opts.status] - PENDING | SENT | FAILED
   * @param {string} [opts.errorMessage]
   */
  static async log(opts) {
    const {
      organizationId,
      hearingId = null,
      notificationType,
      channel = 'SYSTEM',
      recipient = null,
      subject = null,
      bodyPreview = null,
      status = 'PENDING',
      errorMessage = null
    } = opts;
    const log = await NotificationLog.create({
      organization_id: organizationId,
      hearing_id: hearingId,
      notification_type: notificationType,
      channel,
      recipient,
      subject,
      body_preview: bodyPreview ? String(bodyPreview).slice(0, 2000) : null,
      status,
      sent_at: status === 'SENT' ? new Date() : null,
      error_message: errorMessage ? String(errorMessage).slice(0, 1000) : null
    });
    return log;
  }

  static async markSent(logId) {
    const log = await NotificationLog.findByPk(logId);
    if (log) await log.update({ status: 'SENT', sent_at: new Date() });
    return log;
  }

  static async markFailed(logId, errorMessage) {
    const log = await NotificationLog.findByPk(logId);
    if (log) await log.update({ status: 'FAILED', error_message: errorMessage ? String(errorMessage).slice(0, 1000) : null });
    return log;
  }
}

module.exports = NotificationLogService;
