'use strict';

const { StampDutyConfig } = require('../models');
const { Op } = require('sequelize');

async function listConfig(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { state, document_type } = req.query;
    const where = { [Op.or]: [{ organization_id: orgId }, { organization_id: null }] };
    if (state) where.state = state;
    if (document_type) where.document_type = document_type;
    const rows = await StampDutyConfig.findAll({ where, order: [['state', 'ASC'], ['document_type', 'ASC']] });
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function createConfig(req, res, next) {
  try {
    const { state, document_type, rate_type, rate_value, min_amount, max_amount } = req.body;
    const config = await StampDutyConfig.create({
      organization_id: req.user.organization_id,
      state: (state || '').trim(),
      document_type: (document_type || 'OTHER').trim(),
      rate_type: rate_type || 'FIXED',
      rate_value: parseFloat(rate_value) || 0,
      min_amount: min_amount != null ? parseFloat(min_amount) : null,
      max_amount: max_amount != null ? parseFloat(max_amount) : null
    });
    res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    const config = await StampDutyConfig.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id }
    });
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });
    const { state, document_type, rate_type, rate_value, min_amount, max_amount } = req.body;
    if (state !== undefined) config.state = (state || '').trim();
    if (document_type !== undefined) config.document_type = (document_type || 'OTHER').trim();
    if (rate_type !== undefined) config.rate_type = rate_type;
    if (rate_value !== undefined) config.rate_value = parseFloat(rate_value) || 0;
    if (min_amount !== undefined) config.min_amount = min_amount != null ? parseFloat(min_amount) : null;
    if (max_amount !== undefined) config.max_amount = max_amount != null ? parseFloat(max_amount) : null;
    await config.save();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
}

async function calculate(req, res, next) {
  try {
    const { state, document_type, amount } = req.body;
    const orgId = req.user.organization_id;
    const configs = await StampDutyConfig.findAll({
      where: {
        state: (state || '').trim(),
        document_type: (document_type || 'OTHER').trim(),
        [Op.or]: [{ organization_id: orgId }, { organization_id: null }]
      },
      order: [['organization_id', 'DESC']],
      limit: 1
    });
    const config = configs[0] || null;
    if (!config) {
      return res.json({ success: true, data: { stampDuty: null, message: 'No config for this state and document type' } });
    }
    const rateValue = parseFloat(config.rate_value) || 0;
    const minAmt = config.min_amount != null ? parseFloat(config.min_amount) : null;
    const maxAmt = config.max_amount != null ? parseFloat(config.max_amount) : null;
    let stampDuty = 0;
    if (config.rate_type === 'FIXED') {
      stampDuty = rateValue;
    } else {
      const amt = amount != null ? parseFloat(amount) : 0;
      stampDuty = (amt * rateValue) / 100;
    }
    if (minAmt != null && stampDuty < minAmt) stampDuty = minAmt;
    if (maxAmt != null && stampDuty > maxAmt) stampDuty = maxAmt;
    res.json({ success: true, data: { stampDuty, config: config.toJSON() } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listConfig, createConfig, updateConfig, calculate };
