'use strict';

const { AiUsageRecord, AiConfig, Subscription } = require('../../models');
const { Op } = require('sequelize');
const { getActiveSubscription } = require('../../utils/subscriptionService');

/**
 * Get monthly token usage for a user (current month).
 */
async function getUserMonthlyTokens(organizationId, userId) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const result = await AiUsageRecord.sum('tokens_used', {
    where: { organization_id: organizationId, user_id: userId, created_at: { [Op.gte]: start } }
  });
  return Number(result) || 0;
}

/**
 * Get daily token usage for organization (today).
 */
async function getOrgDailyTokens(organizationId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const result = await AiUsageRecord.sum('tokens_used', {
    where: { organization_id: organizationId, created_at: { [Op.gte]: start } }
  });
  return Number(result) || 0;
}

/**
 * Get monthly token limit for organization from subscription/package.
 */
async function getMonthlyTokenLimit(organizationId) {
  const sub = await getActiveSubscription(organizationId);
  const pkg = sub?.Package;
  const limit = pkg && pkg.ai_monthly_token_limit != null ? Number(pkg.ai_monthly_token_limit) : 0;
  return limit;
}

/**
 * Get daily request limit for org from ai_config.
 */
async function getOrgDailyLimit() {
  const config = await AiConfig.findOne({ where: {} });
  return config ? config.rate_limit_org_daily : 500;
}

/**
 * Record usage after an AI call.
 */
async function recordUsage({ organizationId, userId, featureKey, tokensUsed, estimatedCost, sessionId }) {
  await AiUsageRecord.create({
    organization_id: organizationId,
    user_id: userId || null,
    feature_key: featureKey,
    tokens_used: tokensUsed || 0,
    estimated_cost: estimatedCost || null,
    session_id: sessionId || null
  });
}

/**
 * Estimate cost (internal). Simple per-1k tokens rate; adjust per provider.
 */
function estimateCost(tokensUsed, provider = 'sarvam') {
  if (!tokensUsed || tokensUsed <= 0) return 0;
  const per1k = provider === 'openai' ? 0.002 : 0.001;
  return Math.round((tokensUsed / 1000) * per1k * 1000000) / 1000000;
}

module.exports = {
  getUserMonthlyTokens,
  getOrgDailyTokens,
  getMonthlyTokenLimit,
  getOrgDailyLimit,
  recordUsage,
  estimateCost
};
