const { Subscription, Invoice, Package, Module, Organization, Case } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../utils/db').sequelize;
const { getActiveSubscription, syncOrgModulesFromPackage } = require('../utils/subscriptionService');
const paymentService = require('../utils/paymentService');
const { queueWhatsAppMessage } = require('../utils/whatsappQueue');
const auditService = require('../utils/auditService');

const FEE_FIELDS = ['professional_fee', 'filing_fee', 'clerk_fee', 'court_fee', 'misc_expense'];

function computeInvoiceTotals(fees, gstEnabled, gstPercentage, advanceReceived) {
  const subtotal = FEE_FIELDS.reduce((sum, key) => sum + (Number(fees[key]) || 0), 0);
  const gstAmount = (gstEnabled && Number(gstPercentage) > 0) ? (subtotal * Number(gstPercentage) / 100) : 0;
  const totalAmount = subtotal + gstAmount;
  const adv = Number(advanceReceived) || 0;
  const balanceDue = Math.max(0, totalAmount - adv);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gst_amount: Math.round(gstAmount * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    balance_due: Math.round(balanceDue * 100) / 100
  };
}

function getPaymentStatusDisplay(inv) {
  const status = inv.status;
  const balanceDue = Number(inv.balance_due);
  const advanceReceived = Number(inv.advance_received) || 0;
  const totalAmount = Number(inv.total_amount) ?? Number(inv.amount);
  if (status === 'PAID' || (inv.paid_at && balanceDue <= 0)) return 'PAID';
  if (advanceReceived > 0 && balanceDue > 0) return 'PARTIAL';
  return 'UNPAID';
}

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
    const { page = 1, limit = 20, status, case_id: caseId } = req.query;
    const where = { organization_id: req.user.organization_id };
    if (status) where.status = status;
    if (caseId) where.case_id = caseId;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
      include: [{ model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], required: false }]
    });
    const data = rows.map((r) => {
      const j = r.toJSON ? r.toJSON() : r;
      j.payment_status_display = getPaymentStatusDisplay(j);
      return j;
    });
    res.json({ success: true, data, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
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

/** Create advocate/fee invoice (Indian style with fee breakdown). Subscription flow unchanged. */
async function createAdvocateInvoice(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const body = req.body;
    const professionalFee = Number(body.professional_fee) || 0;
    const filingFee = Number(body.filing_fee) || 0;
    const clerkFee = Number(body.clerk_fee) || 0;
    const courtFee = Number(body.court_fee) || 0;
    const miscExpense = Number(body.misc_expense) || 0;
    const advanceReceived = Number(body.advance_received) || 0;
    const gstEnabled = !!body.gst_enabled;
    const gstPercentage = Number(body.gst_percentage) || 0;
    const caseId = body.case_id ? parseInt(body.case_id, 10) : null;

    if (caseId) {
      const c = await Case.findOne({ where: { id: caseId, organization_id: orgId, is_deleted: false } });
      if (!c) return res.status(400).json({ success: false, message: 'Case not found' });
    }

    const { gst_amount, total_amount, balance_due } = computeInvoiceTotals(
      { professional_fee: professionalFee, filing_fee: filingFee, clerk_fee: clerkFee, court_fee: courtFee, misc_expense: miscExpense },
      gstEnabled,
      gstPercentage,
      advanceReceived
    );
    const status = balance_due <= 0 ? 'PAID' : (advanceReceived > 0 ? 'PARTIAL' : 'PENDING');
    const dueDate = body.due_date || null;

    const invoice = await Invoice.create({
      organization_id: orgId,
      case_id: caseId,
      amount: total_amount,
      currency: 'INR',
      status,
      due_date: dueDate || undefined,
      professional_fee: professionalFee,
      filing_fee: filingFee,
      clerk_fee: clerkFee,
      court_fee: courtFee,
      misc_expense: miscExpense,
      advance_received: advanceReceived,
      gst_enabled: gstEnabled,
      gst_percentage: gstPercentage,
      gst_amount,
      total_amount,
      balance_due
    });
    const out = invoice.toJSON();
    out.payment_status_display = getPaymentStatusDisplay(out);
    res.status(201).json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
}

/** Update advocate invoice (recompute totals). */
async function updateAdvocateInvoice(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const inv = await Invoice.findOne({
      where: { id: req.params.id, organization_id: orgId }
    });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (inv.subscription_id != null) return res.status(400).json({ success: false, message: 'Subscription invoices cannot be edited' });

    const body = req.body;
    const professionalFee = Number(body.professional_fee) ?? Number(inv.professional_fee) ?? 0;
    const filingFee = Number(body.filing_fee) ?? Number(inv.filing_fee) ?? 0;
    const clerkFee = Number(body.clerk_fee) ?? Number(inv.clerk_fee) ?? 0;
    const courtFee = Number(body.court_fee) ?? Number(inv.court_fee) ?? 0;
    const miscExpense = Number(body.misc_expense) ?? Number(inv.misc_expense) ?? 0;
    const advanceReceived = Number(body.advance_received) ?? Number(inv.advance_received) ?? 0;
    const gstEnabled = body.gst_enabled !== undefined ? !!body.gst_enabled : !!inv.gst_enabled;
    const gstPercentage = Number(body.gst_percentage) ?? Number(inv.gst_percentage) ?? 0;
    const caseId = body.case_id !== undefined ? (body.case_id ? parseInt(body.case_id, 10) : null) : inv.case_id;

    if (caseId) {
      const c = await Case.findOne({ where: { id: caseId, organization_id: orgId, is_deleted: false } });
      if (!c) return res.status(400).json({ success: false, message: 'Case not found' });
    }

    const { gst_amount, total_amount, balance_due } = computeInvoiceTotals(
      { professional_fee: professionalFee, filing_fee: filingFee, clerk_fee: clerkFee, court_fee: courtFee, misc_expense: miscExpense },
      gstEnabled,
      gstPercentage,
      advanceReceived
    );
    const status = balance_due <= 0 ? 'PAID' : (advanceReceived > 0 ? 'PARTIAL' : 'PENDING');

    await inv.update({
      case_id: caseId,
      amount: total_amount,
      status,
      due_date: body.due_date !== undefined ? body.due_date || null : inv.due_date,
      professional_fee: professionalFee,
      filing_fee: filingFee,
      clerk_fee: clerkFee,
      court_fee: courtFee,
      misc_expense: miscExpense,
      advance_received: advanceReceived,
      gst_enabled: gstEnabled,
      gst_percentage: gstPercentage,
      gst_amount,
      total_amount,
      balance_due
    });
    const out = inv.toJSON();
    out.payment_status_display = getPaymentStatusDisplay(out);
    res.json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
}

/** Dashboard stats: total pending payments, this month revenue. */
async function getBillingDashboardStats(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [pendingRows, revenueRows] = await Promise.all([
      Invoice.findAll({
        where: {
          organization_id: orgId,
          [Op.or]: [
            { balance_due: { [Op.gt]: 0 } },
            { status: { [Op.in]: ['PENDING', 'PARTIAL'] } }
          ]
        },
        attributes: ['balance_due', 'total_amount', 'amount', 'status', 'advance_received']
      }),
      Invoice.findAll({
        where: {
          organization_id: orgId,
          status: 'PAID',
          paid_at: { [Op.between]: [monthStart, monthEnd] }
        },
        attributes: ['total_amount', 'amount']
      })
    ]);

    let totalPending = 0;
    for (const r of pendingRows) {
      const bal = Number(r.balance_due);
      if (bal > 0) {
        totalPending += bal;
      } else if (r.status !== 'PAID') {
        const total = Number(r.total_amount) ?? Number(r.amount) ?? 0;
        const adv = Number(r.advance_received) || 0;
        if (total - adv > 0) totalPending += total - adv;
      }
    }
    const thisMonthRevenue = revenueRows.reduce((sum, r) => sum + (Number(r.total_amount) ?? Number(r.amount) ?? 0), 0);

    res.json({
      success: true,
      data: {
        total_pending_payments: Math.round(totalPending * 100) / 100,
        this_month_revenue: Math.round(thisMonthRevenue * 100) / 100
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Case-wise expense tracking: cases with their invoice totals. */
async function getExpensesByCase(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const invoices = await Invoice.findAll({
      where: { organization_id: orgId, case_id: { [Op.ne]: null } },
      include: [{ model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], required: true }],
      order: [['created_at', 'DESC']]
    });
    const byCase = {};
    for (const inv of invoices) {
      const cid = inv.case_id;
      if (!byCase[cid]) {
        byCase[cid] = {
          case_id: cid,
          case_title: inv.Case?.case_title,
          case_number: inv.Case?.case_number,
          total_invoiced: 0,
          total_paid: 0,
          balance_due: 0,
          invoice_count: 0,
          invoices: []
        };
      }
      const total = Number(inv.total_amount) ?? Number(inv.amount) ?? 0;
      const bal = Number(inv.balance_due);
      const adv = Number(inv.advance_received) || 0;
      byCase[cid].total_invoiced += total;
      byCase[cid].balance_due += bal;
      byCase[cid].total_paid += (inv.status === 'PAID' ? total : adv);
      byCase[cid].invoice_count += 1;
      byCase[cid].invoices.push({
        id: inv.id,
        total_amount: inv.total_amount ?? inv.amount,
        balance_due: inv.balance_due,
        status: inv.status,
        due_date: inv.due_date,
        created_at: inv.created_at
      });
    }
    const data = Object.values(byCase).map((c) => ({
      ...c,
      total_invoiced: Math.round(c.total_invoiced * 100) / 100,
      total_paid: Math.round(c.total_paid * 100) / 100,
      balance_due: Math.round(c.balance_due * 100) / 100
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Send WhatsApp payment reminder for an invoice (to organization phone). */
async function sendInvoiceReminderWhatsApp(req, res, next) {
  try {
    const user = req.user;
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, organization_id: user.organization_id }
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const org = await Organization.findByPk(user.organization_id, { attributes: ['phone'] });
    const phone = org?.phone;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Organization phone not set; add phone in organization settings to send WhatsApp.' });
    }

    const amount = (invoice.total_amount ?? invoice.amount) != null ? String(invoice.total_amount ?? invoice.amount) : '—';
    const dueDate = invoice.due_date || '—';
    queueWhatsAppMessage(phone, 'payment_reminder', [amount, dueDate]);

    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'INVOICE',
      entity_id: invoice.id,
      action_type: 'NOTIFY',
      module_name: 'BILLING',
      new_value: { template: 'payment_reminder', invoice_id: invoice.id },
      action_summary: `WhatsApp payment reminder sent for invoice #${invoice.id} (due ${dueDate}).`
    });

    res.json({ success: true, message: 'WhatsApp payment reminder queued.' });
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
  paymentGatewayStatus,
  createAdvocateInvoice,
  updateAdvocateInvoice,
  getBillingDashboardStats,
  getExpensesByCase,
  sendInvoiceReminderWhatsApp
};
