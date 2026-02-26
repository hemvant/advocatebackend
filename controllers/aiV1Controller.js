'use strict';

const { AiChatSession, AiChatMessage, AiUsageRecord } = require('../models');
const { Op } = require('sequelize');
const AIService = require('../services/ai/AIService');
const featureHandlers = require('../services/ai/featureHandlers');
const SubscriptionGuard = require('../services/ai/SubscriptionGuard');
const TokenTrackingService = require('../services/ai/TokenTrackingService');
const PromptTemplateEngine = require('../services/ai/PromptTemplateEngine');

const CONTEXT_MEMORY_MESSAGES = 20;

function context(req) {
  return { organizationId: req.user.organization_id, userId: req.user.id };
}

async function caseSummary(req, res, next) {
  try {
    const result = await featureHandlers.caseSummary(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { summary: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function draft(req, res, next) {
  try {
    const result = await featureHandlers.draft(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { draft_text: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function judgmentSummary(req, res, next) {
  try {
    const result = await featureHandlers.judgmentSummary(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { summary: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function crossExam(req, res, next) {
  try {
    const result = await featureHandlers.crossExam(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { questions: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function firAnalysis(req, res, next) {
  try {
    const result = await featureHandlers.firAnalysis(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { analysis: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function legalResearch(req, res, next) {
  try {
    const result = await featureHandlers.legalResearch(context(req), req.body || {});
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, data: { answer: result.text, usage: result.usage, tokens_used: result.tokensUsed } });
  } catch (e) { next(e); }
}

async function chatStart(req, res, next) {
  try {
    const canUse = await SubscriptionGuard.canUseFeature(req.user.organization_id, 'chat');
    if (!canUse) return res.status(403).json({ success: false, message: 'Chat not available in your plan' });
    const title = (req.body && req.body.title) ? String(req.body.title).slice(0, 255) : 'New chat';
    const session = await AiChatSession.create({
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      title
    });
    res.status(201).json({ success: true, data: { session_id: session.id, title: session.title } });
  } catch (e) { next(e); }
}

async function chatMessage(req, res, next) {
  try {
    const sessionId = parseInt(req.body?.session_id, 10);
    const content = req.body?.content ? String(req.body.content).trim() : '';
    if (!sessionId || !content) return res.status(400).json({ success: false, message: 'session_id and content required' });
    const session = await AiChatSession.findOne({
      where: { id: sessionId, organization_id: req.user.organization_id }
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const canUse = await SubscriptionGuard.canUseFeature(req.user.organization_id, 'chat');
    if (!canUse) return res.status(403).json({ success: false, message: 'Chat not available in your plan' });
    const messages = await AiChatMessage.findAll({
      where: { session_id: sessionId },
      order: [['id', 'ASC']],
      limit: CONTEXT_MEMORY_MESSAGES,
      attributes: ['role', 'content']
    });
    const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }));
    chatHistory.push({ role: 'user', content: content });
    const result = await AIService.completeRequest(
      context(req),
      'chat',
      { messages: chatHistory, sessionId }
    );
    if (!result.success) return res.status(400).json({ success: false, message: result.error });
    await AiChatMessage.create({ session_id: sessionId, role: 'user', content, tokens_used: null });
    await AiChatMessage.create({
      session_id: sessionId,
      role: 'assistant',
      content: result.text,
      tokens_used: result.tokensUsed || null
    });
    res.json({
      success: true,
      data: {
        message: result.text,
        usage: result.usage,
        tokens_used: result.tokensUsed
      }
    });
  } catch (e) { next(e); }
}

async function chatHistory(req, res, next) {
  try {
    const sessionId = parseInt(req.query.session_id, 10);
    if (!sessionId) return res.status(400).json({ success: false, message: 'session_id required' });
    const session = await AiChatSession.findOne({
      where: { id: sessionId, organization_id: req.user.organization_id }
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const messages = await AiChatMessage.findAll({
      where: { session_id: sessionId },
      order: [['id', 'ASC']],
      attributes: ['id', 'role', 'content', 'tokens_used', 'created_at']
    });
    res.json({ success: true, data: { session: { id: session.id, title: session.title }, messages } });
  } catch (e) { next(e); }
}

async function chatSessions(req, res, next) {
  try {
    const sessions = await AiChatSession.findAll({
      where: { organization_id: req.user.organization_id, user_id: req.user.id },
      order: [['updated_at', 'DESC']],
      attributes: ['id', 'title', 'created_at', 'updated_at']
    });
    res.json({ success: true, data: sessions });
  } catch (e) { next(e); }
}

async function chatSessionUpdate(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const session = await AiChatSession.findOne({ where: { id, organization_id: req.user.organization_id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const title = req.body?.title ? String(req.body.title).slice(0, 255) : session.title;
    await session.update({ title });
    res.json({ success: true, data: { id: session.id, title: session.title } });
  } catch (e) { next(e); }
}

async function chatSessionDelete(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const session = await AiChatSession.findOne({ where: { id, organization_id: req.user.organization_id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    await session.destroy();
    res.json({ success: true, message: 'Session deleted' });
  } catch (e) { next(e); }
}

async function usage(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const userId = req.user.id;
    const period = req.query.period || 'month';
    const start = new Date();
    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'day') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setMonth(start.getMonth() - 1);
    }
    const where = { organization_id: orgId, created_at: { [Op.gte]: start } };
    if (req.query.user_only === '1') where.user_id = userId;
    const total = await AiUsageRecord.sum('tokens_used', { where }) || 0;
    const limit = await TokenTrackingService.getMonthlyTokenLimit(orgId);
    const byFeature = await AiUsageRecord.findAll({
      where,
      attributes: ['feature_key'],
      group: ['feature_key'],
      raw: true
    });
    const featureCounts = await Promise.all(
      byFeature.map(async (f) => ({
        feature_key: f.feature_key,
        tokens: await AiUsageRecord.sum('tokens_used', { where: { ...where, feature_key: f.feature_key } })
      }))
    );
    res.json({
      success: true,
      data: {
        tokens_used: total,
        token_limit: limit,
        period,
        by_feature: featureCounts
      }
    });
  } catch (e) { next(e); }
}

async function allowedFeatures(req, res, next) {
  try {
    const features = await SubscriptionGuard.getAllowedFeatures(req.user.organization_id);
    res.json({ success: true, data: { features } });
  } catch (e) { next(e); }
}

async function promptTemplatesList(req, res, next) {
  try {
    const { AiPromptTemplate } = require('../models');
    const rows = await AiPromptTemplate.findAll({ where: { is_active: true }, attributes: ['feature_key', 'temperature', 'max_tokens'] });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

module.exports = {
  caseSummary,
  draft,
  judgmentSummary,
  crossExam,
  firAnalysis,
  legalResearch,
  chatStart,
  chatMessage,
  chatHistory,
  chatSessions,
  chatSessionUpdate,
  chatSessionDelete,
  usage,
  allowedFeatures,
  promptTemplatesList
};
