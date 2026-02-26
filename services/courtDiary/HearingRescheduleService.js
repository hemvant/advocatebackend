'use strict';

const { sequelize, CaseHearing, HearingLog, Case, Client, OrganizationUser } = require('../../models');
const NotificationLogService = require('./NotificationLogService');
const { queueWhatsAppMessage } = require('../../utils/whatsappQueue');
const logger = require('../../utils/logger');

/**
 * Reschedules a hearing, logs to hearing_logs, and triggers notifications.
 * Multi-org: hearing must belong to user's organization.
 */
class HearingRescheduleService {
  /**
   * @param {Object} opts
   * @param {number} opts.hearingId
   * @param {number} opts.organizationId
   * @param {number} opts.changedByUserId
   * @param {Date|string} opts.newHearingDate
   * @param {string} [opts.reason]
   * @returns {Promise<{ hearing: CaseHearing, log: HearingLog }>}
   */
  static async reschedule(opts) {
    const { hearingId, organizationId, changedByUserId, newHearingDate, reason } = opts;
    const hearing = await CaseHearing.findOne({
      where: { id: hearingId, organization_id: organizationId, is_deleted: false },
      include: [
        { model: Case, as: 'Case', required: true, include: [
          { model: Client, as: 'Client', attributes: ['id', 'name', 'phone'] },
          { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'phone'] }
        ]}
      ]
    });
    if (!hearing) return null;

    const oldDate = hearing.hearing_date;
    const newDate = newHearingDate ? new Date(newHearingDate) : null;

    const t = await sequelize.transaction();
    try {
      await hearing.update({ hearing_date: newDate }, { transaction: t });
      const log = await HearingLog.create({
        organization_id: organizationId,
        hearing_id: hearingId,
        old_hearing_date: oldDate,
        new_hearing_date: newDate,
        changed_by: changedByUserId,
        reason: reason ? String(reason).slice(0, 500) : null
      }, { transaction: t });
      await t.commit();

      setImmediate(() => {
        HearingRescheduleService.sendRescheduleNotifications(hearing, oldDate, newDate).catch((err) =>
          logger.warn('[CourtDiary] Reschedule notify error:', err.message)
        );
      });

      return { hearing: await hearing.reload(), log };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  static async sendRescheduleNotifications(hearing, oldDate, newDate) {
    const caseTitle = hearing.Case?.case_title || 'Case';
    const oldStr = oldDate ? new Date(oldDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    const newStr = newDate ? new Date(newDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    const params = [caseTitle, oldStr, newStr];

    const logPayload = {
      organizationId: hearing.organization_id,
      hearingId: hearing.id,
      notificationType: 'HEARING_RESCHEDULE',
      bodyPreview: `Reschedule: ${caseTitle} from ${oldStr} to ${newStr}`
    };

    if (hearing.Case?.Assignee?.phone) {
      const nl = await NotificationLogService.log({
        ...logPayload,
        channel: 'WHATSAPP',
        recipient: hearing.Case.Assignee.phone,
        status: 'PENDING'
      });
      try {
        queueWhatsAppMessage(hearing.Case.Assignee.phone, 'hearing_reschedule', params);
        await NotificationLogService.markSent(nl.id);
      } catch (e) {
        await NotificationLogService.markFailed(nl.id, e.message);
      }
    }
    if (hearing.Case?.Client?.phone) {
      const nl = await NotificationLogService.log({
        ...logPayload,
        channel: 'WHATSAPP',
        recipient: hearing.Case.Client.phone,
        status: 'PENDING'
      });
      try {
        queueWhatsAppMessage(hearing.Case.Client.phone, 'hearing_reschedule', params);
        await NotificationLogService.markSent(nl.id);
      } catch (e) {
        await NotificationLogService.markFailed(nl.id, e.message);
      }
    }
  }
}

module.exports = HearingRescheduleService;
