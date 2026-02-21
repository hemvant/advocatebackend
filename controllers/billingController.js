const { Subscription, Invoice, Package, Module } = require('../models');
const { Op } = require('sequelize');
const { getActiveSubscription } = require('../utils/subscriptionService');

async function getMySubscription(req, res, next) {
  try {
    const sub = await getActiveSubscription(req.user.organization_id);
    if (!sub) {
      return res.json({ success: true, data: null, message: 'No active subscription' });
    }
    const pkg = sub.Package;
    const withModules = pkg ? await Package.findByPk(pkg.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name', 'description'] }]
    }) : null;
    const out = sub.toJSON();
    out.Package = withModules ? withModules.toJSON() : (pkg ? pkg.toJSON() : null);
    res.json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
}

async function getMyInvoices(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = { organization_id: req.user.organization_id };
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
      attributes: ['id', 'amount', 'currency', 'status', 'period_start', 'period_end', 'due_date', 'paid_at', 'created_at']
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMySubscription, getMyInvoices };
