'use strict';

const { sendTemplateMessage } = require('../services/whatsappService');
const logger = require('../utils/logger');

let whatsappQueue = null;
try {
  const queues = require('../queues');
  whatsappQueue = queues.whatsappQueue;
} catch (_) {}

/**
 * Queue a WhatsApp template message (or send directly if queue unavailable). Fails silently; logs errors.
 * @param {string} to - Phone number
 * @param {string} templateName - e.g. hearing_reminder, payment_reminder
 * @param {string[]} [parameters] - Template parameters
 */
async function queueWhatsAppMessage(to, templateName, parameters = []) {
  if (whatsappQueue) {
    whatsappQueue.add('send', { to, template_name: templateName, parameters }).catch((err) => {
      logger.warn('[WhatsApp] Queue add failed, sending inline:', err.message);
      sendTemplateMessage(to, templateName, parameters).catch((e) => logger.warn('[WhatsApp] Inline send failed:', e.message));
    });
    return;
  }
  sendTemplateMessage(to, templateName, parameters).catch((err) => logger.warn('[WhatsApp] Send failed:', err.message));
}

module.exports = { queueWhatsAppMessage };
