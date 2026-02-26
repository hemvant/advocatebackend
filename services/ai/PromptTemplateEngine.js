'use strict';

const { AiPromptTemplate } = require('../../models');

/**
 * Replace {{placeholder}} in template with values from data. Sanitizes to prevent injection.
 */
function sanitizeForPrompt(value) {
  if (value == null) return '';
  const s = String(value).slice(0, 100000);
  return s.replace(/\{\{|\}\}/g, '').trim();
}

function replacePlaceholders(template, data) {
  if (!template || typeof template !== 'string') return template || '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => sanitizeForPrompt(data[key]));
}

/**
 * Get template for feature_key. Returns { system_prompt, user_prompt_format, temperature, max_tokens } or null.
 */
async function getTemplate(featureKey) {
  const row = await AiPromptTemplate.findOne({
    where: { feature_key: featureKey, is_active: true }
  });
  return row ? {
    system_prompt: row.system_prompt,
    user_prompt_format: row.user_prompt_format,
    temperature: Number(row.temperature) ?? 0.3,
    max_tokens: Number(row.max_tokens) ?? 4096
  } : null;
}

/**
 * Build messages array: system (if present) + user message with placeholders replaced.
 */
function buildMessages(template, userContent, placeholders = {}) {
  const messages = [];
  if (template && template.system_prompt) {
    messages.push({ role: 'system', content: replacePlaceholders(template.system_prompt, placeholders) });
  }
  const userText = template && template.user_prompt_format
    ? replacePlaceholders(template.user_prompt_format, { ...placeholders, content: userContent, user_input: userContent })
    : userContent;
  messages.push({ role: 'user', content: sanitizeForPrompt(userText) });
  return messages;
}

module.exports = {
  getTemplate,
  buildMessages,
  replacePlaceholders,
  sanitizeForPrompt
};
