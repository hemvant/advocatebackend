'use strict';

const { getUserMonthlyTokens, getMonthlyTokenLimit } = require('./TokenTrackingService');
const { getActiveSubscription } = require('../../utils/subscriptionService');

const FEATURE_KEYS = [
  'case_summary',
  'draft',
  'judgment_summary',
  'cross_exam',
  'fir_analysis',
  'legal_research',
  'chat'
];

/**
 * Get allowed AI feature keys for organization from subscription package.
 */
async function getAllowedFeatures(organizationId) {
  const sub = await getActiveSubscription(organizationId);
  const pkg = sub?.Package;
  const features = pkg && Array.isArray(pkg.ai_features) ? pkg.ai_features : [];
  if (features.length === 0) return [];
  return FEATURE_KEYS.filter((f) => features.includes(f));
}

/**
 * Check if organization has access to a specific AI feature.
 */
async function canUseFeature(organizationId, featureKey) {
  const allowed = await getAllowedFeatures(organizationId);
  return allowed.includes(featureKey);
}

/**
 * Check user's monthly token limit vs subscription. Returns { allowed: boolean, used: number, limit: number }.
 */
async function checkUserTokenLimit(organizationId, userId) {
  const used = await getUserMonthlyTokens(organizationId, userId);
  const limit = await getMonthlyTokenLimit(organizationId);
  return {
    allowed: limit <= 0 || used < limit,
    used,
    limit
  };
}

module.exports = {
  FEATURE_KEYS,
  getAllowedFeatures,
  canUseFeature,
  checkUserTokenLimit
};
