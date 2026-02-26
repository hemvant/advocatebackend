'use strict';

const { AiConfig } = require('../../models');
const { decrypt, maskKey } = require('./cryptoHelper');
const SarvamProvider = require('./providers/SarvamProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');

let cachedConfig = null;
let cachedProvider = null;

/**
 * Get active AI config (single row). Cached in memory; call clearCache() after admin updates.
 */
async function getActiveConfig() {
  if (cachedConfig) return cachedConfig;
  const row = await AiConfig.findOne({ where: { is_active: true } });
  cachedConfig = row;
  return row;
}

/**
 * Clear in-memory cache (call after admin updates AI config).
 */
function clearCache() {
  cachedConfig = null;
  cachedProvider = null;
}

/**
 * Get the current provider instance (Sarvam or OpenAI) based on ai_config.
 * All AI calls must go through this; no direct provider usage from controllers.
 */
async function getProvider() {
  if (cachedProvider) return cachedProvider;
  const config = await getActiveConfig();
  if (!config || !config.encrypted_api_key) {
    cachedProvider = null;
    return null;
  }
  const apiKey = decrypt(config.encrypted_api_key);
  if (!apiKey) {
    cachedProvider = null;
    return null;
  }
  const providerName = (config.provider || 'sarvam').toLowerCase();
  if (providerName === 'openai') {
    cachedProvider = new OpenAIProvider({
      apiKey,
      baseUrl: config.base_url || undefined,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    });
  } else {
    cachedProvider = new SarvamProvider({
      apiKey,
      baseUrl: config.base_url || undefined,
      model: process.env.SARVAM_MODEL || 'sarvam-m'
    });
  }
  return cachedProvider;
}

/**
 * Get config for rate limits and display (no decrypted key).
 */
async function getConfigForLimits() {
  const config = await getActiveConfig();
  if (!config) return null;
  return {
    provider: config.provider,
    api_key_masked: config.api_key_masked || maskKey('stored'),
    rate_limit_per_user_per_min: config.rate_limit_per_user_per_min,
    rate_limit_org_daily: config.rate_limit_org_daily,
    is_active: config.is_active
  };
}

module.exports = {
  getActiveConfig,
  getProvider,
  getConfigForLimits,
  clearCache
};
