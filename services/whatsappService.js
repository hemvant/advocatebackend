'use strict';

const https = require('https');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Normalize phone to digits only (E.164 without +). WhatsApp expects country code + number.
 * @param {string} phone
 * @returns {string|null} digits only or null if invalid
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits;
}

/**
 * Send a template message via WhatsApp Business API (or mock when not configured).
 * @param {string} to - Recipient phone (will be normalized to E.164 digits)
 * @param {string} templateName - e.g. hearing_reminder, payment_reminder
 * @param {string[]} parameters - Template body parameters (order matters)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendTemplateMessage(to, templateName, parameters = []) {
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    logger.warn('[WhatsApp] Invalid or missing phone:', (to || '').slice(0, 20));
    return { success: false, error: 'Invalid or missing phone number' };
  }

  const { isConfigured, apiUrl, accessToken, phoneId } = config.whatsapp || {};
  if (!isConfigured || !apiUrl || !accessToken || !phoneId) {
    logger.info('[WhatsApp] Mock send:', templateName, 'to', normalizedTo.slice(-4), 'params', parameters?.length || 0);
    return { success: true };
  }

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: []
    }
  };
  if (parameters && parameters.length > 0) {
    body.template.components.push({
      type: 'body',
      parameters: parameters.map((p) => ({ type: 'text', text: String(p ?? '').slice(0, 1024) }))
    });
  }

  try {
    const url = new URL(apiUrl.replace(/\/+$/, ''));
    const path = (url.pathname || '/').replace(/\/+$/, '') + '/' + encodeURIComponent(phoneId) + '/messages';
    const isHttps = url.protocol === 'https:';
    const postData = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: 'Bearer ' + accessToken
      }
    };

    const raw = await new Promise((resolve, reject) => {
      const req = (isHttps ? require('https') : require('http')).request(options, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`WhatsApp API ${res.statusCode}: ${data.slice(0, 300)}`));
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('WhatsApp API timeout')); });
      req.write(postData);
      req.end();
    });
    return { success: true };
  } catch (err) {
    logger.warn('[WhatsApp] sendTemplateMessage failed:', err.message);
    return { success: false, error: err.message || 'Failed to send' };
  }
}

module.exports = { sendTemplateMessage, normalizePhone };
