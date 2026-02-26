'use strict';

const { AiConfig, AiUsageRecord, AiPromptTemplate, Organization } = require('../models');
const { Op } = require('sequelize');
const ProviderManager = require('../services/ai/ProviderManager');
const { encrypt, maskKey } = require('../services/ai/cryptoHelper');

async function getConfig(req, res, next) {
  try {
    let config = await AiConfig.findOne({ where: {} });
    if (!config) {
      config = await AiConfig.create({
        provider: 'sarvam',
        rate_limit_per_user_per_min: 10,
        rate_limit_org_daily: 500,
        is_active: false
      });
    }
    res.json({
      success: true,
      data: {
        id: config.id,
        provider: config.provider,
        api_key_masked: config.api_key_masked || (config.encrypted_api_key ? maskKey('stored') : null),
        base_url: config.base_url,
        rate_limit_per_user_per_min: config.rate_limit_per_user_per_min,
        rate_limit_org_daily: config.rate_limit_org_daily,
        is_active: config.is_active
      }
    });
  } catch (e) { next(e); }
}

async function updateConfig(req, res, next) {
  try {
    let config = await AiConfig.findOne({ where: {} });
    if (!config) {
      config = await AiConfig.create({
        provider: req.body.provider || 'sarvam',
        rate_limit_per_user_per_min: req.body.rate_limit_per_user_per_min ?? 10,
        rate_limit_org_daily: req.body.rate_limit_org_daily ?? 500,
        is_active: !!req.body.is_active
      });
    } else {
      const updates = {};
      if (req.body.provider !== undefined) updates.provider = String(req.body.provider).toLowerCase() === 'openai' ? 'openai' : 'sarvam';
      if (req.body.base_url !== undefined) updates.base_url = req.body.base_url ? String(req.body.base_url).trim() : null;
      if (req.body.rate_limit_per_user_per_min !== undefined) updates.rate_limit_per_user_per_min = Math.max(1, parseInt(req.body.rate_limit_per_user_per_min, 10) || 10);
      if (req.body.rate_limit_org_daily !== undefined) updates.rate_limit_org_daily = Math.max(1, parseInt(req.body.rate_limit_org_daily, 10) || 500);
      if (req.body.is_active !== undefined) updates.is_active = !!req.body.is_active;
      if (req.body.api_key !== undefined && req.body.api_key) {
        const plain = String(req.body.api_key).trim();
        updates.encrypted_api_key = encrypt(plain);
        updates.api_key_masked = maskKey(plain);
      }
      await config.update(updates);
    }
    ProviderManager.clearCache();
    const out = await AiConfig.findByPk(config.id, { attributes: ['id', 'provider', 'api_key_masked', 'base_url', 'rate_limit_per_user_per_min', 'rate_limit_org_daily', 'is_active'] });
    res.json({ success: true, data: out });
  } catch (e) { next(e); }
}

async function getUsage(req, res, next) {
  try {
    const start = req.query.from ? new Date(req.query.from) : (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; })();
    const end = req.query.to ? new Date(req.query.to) : new Date();
    const where = { created_at: { [Op.between]: [start, end] } };
    const totalTokens = await AiUsageRecord.sum('tokens_used', { where }) || 0;
    const byOrg = await AiUsageRecord.findAll({
      where,
      attributes: ['organization_id'],
      group: ['organization_id'],
      raw: true
    });
    const orgUsage = await Promise.all(
      byOrg.map(async (o) => {
        const tokens = await AiUsageRecord.sum('tokens_used', { where: { ...where, organization_id: o.organization_id } });
        const org = await Organization.findByPk(o.organization_id, { attributes: ['id', 'name'] });
        return { organization_id: o.organization_id, organization_name: org?.name, tokens_used: tokens || 0 };
      })
    );
    res.json({
      success: true,
      data: {
        total_tokens: totalTokens,
        by_organization: orgUsage,
        from: start,
        to: end
      }
    });
  } catch (e) { next(e); }
}

async function getEstimatedCost(req, res, next) {
  try {
    const start = req.query.from ? new Date(req.query.from) : (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; })();
    const end = req.query.to ? new Date(req.query.to) : new Date();
    const where = { created_at: { [Op.between]: [start, end] } };
    const records = await AiUsageRecord.findAll({ where, attributes: ['tokens_used', 'estimated_cost'] });
    let totalCost = 0;
    let totalTokens = 0;
    records.forEach((r) => {
      totalTokens += Number(r.tokens_used) || 0;
      totalCost += Number(r.estimated_cost) || 0;
    });
    res.json({
      success: true,
      data: {
        total_tokens: totalTokens,
        estimated_cost: Math.round(totalCost * 1000000) / 1000000,
        from: start,
        to: end
      }
    });
  } catch (e) { next(e); }
}

async function listPromptTemplates(req, res, next) {
  try {
    const rows = await AiPromptTemplate.findAll({
      order: [['feature_key', 'ASC']],
      attributes: ['id', 'feature_key', 'system_prompt', 'user_prompt_format', 'temperature', 'max_tokens', 'is_active']
    });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

async function updatePromptTemplate(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const template = await AiPromptTemplate.findByPk(id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const updates = {};
    if (req.body.system_prompt !== undefined) updates.system_prompt = req.body.system_prompt;
    if (req.body.user_prompt_format !== undefined) updates.user_prompt_format = req.body.user_prompt_format;
    if (req.body.temperature !== undefined) updates.temperature = Math.max(0, Math.min(2, parseFloat(req.body.temperature) || 0.3));
    if (req.body.max_tokens !== undefined) updates.max_tokens = Math.max(100, parseInt(req.body.max_tokens, 10) || 4096);
    if (req.body.is_active !== undefined) updates.is_active = !!req.body.is_active;
    await template.update(updates);
    res.json({ success: true, data: template });
  } catch (e) { next(e); }
}

module.exports = {
  getConfig,
  updateConfig,
  getUsage,
  getEstimatedCost,
  listPromptTemplates,
  updatePromptTemplate
};
