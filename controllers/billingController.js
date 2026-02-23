const { Subscription, Invoice, Package, Module, Organization } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../utils/db').sequelize;
const { getActiveSubscription, syncOrgModulesFromPackage } = require('../utils/subscriptionService');
const paymentService = require('../utils/paymentService');

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
      attributes: ['id', 'amount', 'currency', 'status', 'period_start', 'period_end', 'due_date', 'paid_at', 'payment_id', 'transaction_id', 'gateway_order_id', 'created_at']
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

/** List packages available for purchase (active, non-demo). */
async function getPackages(req, res, next) {
  try {
    const packages = await Package.findAll({
      where: { is_active: true, is_demo: false },
      attributes: ['id', 'name', 'description', 'price_monthly', 'price_annual', 'employee_limit', 'duration_days'],
      order: [['id', 'ASC']]
    });
    res.json({ success: true, data: packages });
  } catch (err) {
    next(err);
  }
}

/** Create order: create PENDING invoice and gateway order (or mock). */
async function createOrder(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const orgId = req.user.organization_id;
    const { package_id, billing_cycle } = req.body;

    const pkg = await Package.findByPk(package_id);
    if (!pkg || !pkg.is_active || pkg.is_demo) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid or demo package' });
    }

    const amount = billing_cycle === 'ANNUAL' ? Number(pkg.price_annual) : Number(pkg.price_monthly);
    const amountPaise = Math.round(amount * 100);
    if (amountPaise <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const now = new Date();
    const durationDays = pkg.duration_days || (billing_cycle === 'ANNUAL' ? 365 : 30);
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + durationDays);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await Invoice.create({
      organization_id: orgId,
      package_id: pkg.id,
      subscription_id: null,
      billing_cycle,
      amount,
      currency: 'INR',
      status: 'PENDING',
      period_start: now.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10)
    }, { transaction: t });

    const { orderId, keyId, isMock } = await paymentService.createOrder(amountPaise, 'INR', 'inv_' + invoice.id);
    await invoice.update({ gateway_order_id: orderId }, { transaction: t });
    await t.commit();

    res.json({
      success: true,
      data: {
        order_id: orderId,
        key_id: keyId,
        amount: amountPaise,
        currency: 'INR',
        invoice_id: invoice.id,
        is_mock: isMock
      }
    });
  } catch (err) {
    await t.rollback().catch(() => {});
    next(err);
  }
}

/** Verify payment and activate subscription. */
async function verifyPayment(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const orgId = req.user.organization_id;
    const { order_id, payment_id, signature } = req.body;

    const invoice = await Invoice.findOne({
      where: { organization_id: orgId, gateway_order_id: order_id, status: 'PENDING' }
    });
    if (!invoice) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order not found or already processed' });
    }

    const verification = await paymentService.verifyPayment(order_id, payment_id, signature);
    if (!verification.success) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const paidAt = new Date();
    await invoice.update({
      status: 'PAID',
      paid_at: paidAt,
      payment_id: verification.paymentId || payment_id,
      transaction_id: verification.transactionId
    }, { transaction: t });

    const pkg = await Package.findByPk(invoice.package_id);
    const durationDays = pkg ? (pkg.duration_days || (invoice.billing_cycle === 'ANNUAL' ? 365 : 30)) : 30;
    const expiresAt = new Date(paidAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    let sub = await Subscription.findOne({ where: { organization_id: orgId }, order: [['id', 'DESC']], transaction: t });
    if (sub) {
      await sub.update({
        package_id: pkg.id,
        plan: pkg.name,
        billing_cycle: invoice.billing_cycle,
        status: 'ACTIVE',
        started_at: paidAt,
        expires_at: expiresAt
      }, { transaction: t });
    } else {
      sub = await Subscription.create({
        organization_id: orgId,
        package_id: pkg.id,
        plan: pkg.name,
        billing_cycle: invoice.billing_cycle,
        status: 'ACTIVE',
        started_at: paidAt,
        expires_at: expiresAt
      }, { transaction: t });
    }

    await invoice.update({ subscription_id: sub.id }, { transaction: t });
    const org = await Organization.findByPk(orgId);
    if (org) await org.update({ subscription_plan: pkg.name }, { transaction: t });

    await t.commit();
    syncOrgModulesFromPackage(orgId, pkg.id).catch(() => {});

    res.json({
      success: true,
      data: { subscription_id: sub.id, invoice_id: invoice.id },
      message: 'Payment verified and subscription activated'
    });
  } catch (err) {
    await t.rollback().catch(() => {});
    next(err);
  }
}

/** Public info: whether real payment gateway is configured (for frontend to show Razorpay vs mock). */
async function paymentGatewayStatus(req, res, next) {
  try {
    res.json({
      success: true,
      data: { is_configured: !paymentService.isMock() }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMySubscription,
  getMyInvoices,
  getPackages,
  createOrder,
  verifyPayment,
  paymentGatewayStatus
};
