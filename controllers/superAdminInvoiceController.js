const { Invoice, Organization, Subscription, Package } = require('../models');
const { Op } = require('sequelize');

const includeOrg = [
  { model: Organization, as: 'Organization', attributes: ['id', 'name'] },
  { model: Package, as: 'Package', attributes: ['id', 'name'], required: false }
];

async function listInvoices(req, res, next) {
  try {
    const { organization_id, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (organization_id) where.organization_id = organization_id;
    if (status) where.status = status;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: includeOrg,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const { organization_id, amount, currency, subscription_id, package_id, billing_cycle, period_start, period_end, due_date } = req.body;
    const org = await Organization.findByPk(organization_id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    const inv = await Invoice.create({
      organization_id,
      amount: Number(amount),
      currency: (currency || 'INR').slice(0, 3),
      subscription_id: subscription_id || null,
      package_id: package_id || null,
      billing_cycle: billing_cycle || null,
      period_start: period_start || null,
      period_end: period_end || null,
      due_date: due_date || null,
      status: 'PENDING'
    });
    const created = await Invoice.findByPk(inv.id, { include: includeOrg });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

async function markInvoicePaid(req, res, next) {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const paid_at = req.body.paid_at ? new Date(req.body.paid_at) : new Date();
    await inv.update({ status: 'PAID', paid_at });
    const updated = await Invoice.findByPk(inv.id, { include: includeOrg });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listInvoices, createInvoice, markInvoicePaid };
