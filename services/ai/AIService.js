'use strict';

const { AiFeatureRequest, AiConfig } = require('../../models');
const ProviderManager = require('./ProviderManager');
const PromptTemplateEngine = require('./PromptTemplateEngine');
const TokenTrackingService = require('./TokenTrackingService');
const SubscriptionGuard = require('./SubscriptionGuard');

/**
 * Central AI service. All feature and chat requests go through here.
 * @param {Object} context - { organizationId, userId }
 * @param {string} featureKey - case_summary | draft | judgment_summary | cross_exam | fir_analysis | legal_research | chat
 * @param {Object} options - { userContent, placeholders, messages (for chat), temperature, max_tokens }
 * @returns {Promise<{ success: boolean, text?: string, usage?: object, error?: string }>}
 */
async function completeRequest(context, featureKey, options = {}) {
  const { organizationId, userId } = context;
  if (!organizationId) {
    return { success: false, error: 'Organization context required' };
  }

  const canUse = await SubscriptionGuard.canUseFeature(organizationId, featureKey);
  if (!canUse) {
    return { success: false, error: 'This AI feature is not available in your plan' };
  }

  const tokenCheck = await SubscriptionGuard.checkUserTokenLimit(organizationId, userId);
  if (!tokenCheck.allowed) {
    return { success: false, error: `Monthly token limit reached (${tokenCheck.used}/${tokenCheck.limit})` };
  }

  const orgDaily = await TokenTrackingService.getOrgDailyTokens(organizationId);
  const dailyLimit = await TokenTrackingService.getOrgDailyLimit();
  if (dailyLimit > 0 && orgDaily >= dailyLimit) {
    return { success: false, error: 'Daily organization AI limit reached' };
  }

  const config = await ProviderManager.getActiveConfig();
  if (!config || !config.encrypted_api_key) {
    return { success: false, error: 'AI provider not configured' };
  }

  let messages = options.messages;
  let temperature = options.temperature;
  let max_tokens = options.max_tokens;

  if (featureKey !== 'chat') {
    const template = await PromptTemplateEngine.getTemplate(featureKey);
    temperature = template ? template.temperature : 0.3;
    max_tokens = template ? template.max_tokens : 4096;
    messages = PromptTemplateEngine.buildMessages(
      template,
      options.userContent || '',
      options.placeholders || {}
    );
  } else if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { success: false, error: 'Chat messages required' };
  }

  const provider = await ProviderManager.getProvider();
  if (!provider) {
    return { success: false, error: 'AI provider unavailable' };
  }

  const result = await provider.chatCompletion(messages, { temperature, max_tokens });
  if (!result || !result.text) {
    return { success: false, error: 'AI request failed or returned empty response' };
  }

  const tokensUsed = result.usage ? (result.usage.total_tokens || result.usage.prompt_tokens + result.usage.completion_tokens) : 0;
  const estimatedCost = TokenTrackingService.estimateCost(tokensUsed, config.provider);

  await TokenTrackingService.recordUsage({
    organizationId,
    userId: userId || null,
    featureKey,
    tokensUsed,
    estimatedCost,
    sessionId: options.sessionId || null
  });

  if (featureKey !== 'chat' && options.audit !== false) {
    await AiFeatureRequest.create({
      organization_id: organizationId,
      user_id: userId || null,
      feature_key: featureKey,
      input_summary: options.inputSummary || (options.userContent ? String(options.userContent).slice(0, 500) : null),
      output_summary: String(result.text).slice(0, 500),
      tokens_used: tokensUsed
    });
  }

  return {
    success: true,
    text: result.text,
    usage: result.usage || { total_tokens: tokensUsed },
    tokensUsed,
    estimatedCost
  };
}

module.exports = {
  completeRequest
};
