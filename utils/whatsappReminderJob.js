'use strict';

const cron = require('node-cron');
const { CaseHearing, Case, Client, OrganizationUser, Invoice, Organization } = require('../models');
const { Op } = require('sequelize');
const { queueWhatsAppMessage } = require('./whatsappQueue');
const logger = require('../utils/logger');

function formatHearingDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

async function runHearingReminderJob() {
  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
  const hearings = await CaseHearing.findAll({
    where: {
      is_deleted: false,
      status: 'UPCOMING',
      whatsapp_reminder_sent: false,
      hearing_date: { [Op.between]: [tomorrowStart, tomorrowEnd] }
    },
    include: [
      { model: Case, as: 'Case', required: true, include: [
        { model: Client, as: 'Client', attributes: ['id', 'name', 'phone'] },
        { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'phone'] }
      ]}
    ]
  }).catch((err) => { logger.warn('[WhatsApp Reminder] Hearing fetch error:', err.message); return []; });

  for (const h of hearings) {
    const caseTitle = h.Case?.case_title || 'Case';
    const hearingDateStr = formatHearingDate(h.hearing_date);
    const courtroom = h.courtroom || '—';
    const params = [caseTitle, hearingDateStr, courtroom];
    let sent = false;
    if (h.Case?.Assignee?.phone) {
      queueWhatsAppMessage(h.Case.Assignee.phone, 'hearing_reminder', params);
      sent = true;
    }
    if (h.Case?.Client?.phone) {
      queueWhatsAppMessage(h.Case.Client.phone, 'hearing_reminder', params);
      sent = true;
    }
    if (sent) {
      await h.update({ whatsapp_reminder_sent: true }).catch(() => {});
    }
  }
}

async function runPaymentReminderJob() {
  const today = new Date().toISOString().slice(0, 10);
  const invoices = await Invoice.findAll({
    where: {
      status: { [Op.ne]: 'PAID' },
      due_date: { [Op.lt]: today },
      payment_reminder_sent_at: null
    }
  }).catch((err) => { logger.warn('[WhatsApp Reminder] Invoice fetch error:', err.message); return []; });

  for (const inv of invoices) {
    const org = await Organization.findByPk(inv.organization_id, { attributes: ['phone'] });
    const phone = org?.phone;
    if (!phone) continue;
    const amount = inv.amount != null ? String(inv.amount) : '—';
    const dueDate = inv.due_date || '—';
    queueWhatsAppMessage(phone, 'payment_reminder', [amount, dueDate]);
    await inv.update({ payment_reminder_sent_at: new Date() }).catch(() => {});
  }
}

async function runWhatsAppReminderCron() {
  try {
    await runHearingReminderJob();
    await runPaymentReminderJob();
  } catch (err) {
    logger.warn('[WhatsApp Reminder] Cron error:', err.message);
  }
}

function initWhatsAppReminderCron() {
  cron.schedule('0 8 * * *', runWhatsAppReminderCron, { scheduled: true });
  logger.info('WhatsApp reminder cron: daily at 8:00 AM');
}

module.exports = { initWhatsAppReminderCron, runWhatsAppReminderCron, runHearingReminderJob, runPaymentReminderJob };
