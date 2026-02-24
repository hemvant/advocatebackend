const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');
const { sendTemplateMessage } = require('../services/whatsappService');
const logger = require('../utils/logger');

async function processWhatsAppJob(job) {
  const { to, template_name, parameters } = job.data || {};
  if (!to || !template_name) {
    logger.warn('[WhatsApp Worker] Job missing to or template_name');
    return null;
  }
  try {
    const result = await sendTemplateMessage(to, template_name, parameters || []);
    if (!result.success) logger.warn('[WhatsApp Worker] Send failed:', result.error);
  } catch (err) {
    logger.warn('[WhatsApp Worker] Error:', err.message);
  }
  return null;
}

function startWhatsAppWorker() {
  if (!redisConfig.isRedisEnabled()) return null;
  try {
    const opts = redisConfig.getRedisOptions();
    const conn = opts.url ? { url: opts.url } : { host: opts.host, port: opts.port, password: opts.password };
    return new Worker('whatsapp', processWhatsAppJob, { connection: conn, concurrency: 2 });
  } catch (err) {
    logger.warn('WhatsApp worker start failed:', err.message);
    return null;
  }
}

module.exports = { startWhatsAppWorker, processWhatsAppJob };
