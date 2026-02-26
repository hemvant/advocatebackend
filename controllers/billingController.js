const { Subscription, Invoice, Package, Module, Organization, Case, InvoiceItem, Payment, Expense, TdsRecord } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../utils/db').sequelize;
const { getActiveSubscription, syncOrgModulesFromPackage } = require('../utils/subscriptionService');
const paymentService = require('../utils/paymentService');
const { queueWhatsAppMessage } = require('../utils/whatsappQueue');
const auditService = require('../utils/auditService');
const { getNextInvoiceNumber } = require('../services/billing/InvoiceNumberService');
const { calculateGst } = require('../services/billing/GstService');
const { generateInvoicePdf } = require('../services/billing/InvoicePdfService');

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
  return 'PENDING';
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

    const subtotal = FEE_FIELDS.reduce((s, k) => s + (Number({ professional_fee: professionalFee, filing_fee: filingFee, clerk_fee: clerkFee, court_fee: courtFee, misc_expense: miscExpense }[k]) || 0), 0);
    const isSameState = body.is_same_state !== false;
    let gstAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    if (gstEnabled && gstPercentage > 0) {
      const gst = calculateGst(subtotal, gstPercentage, isSameState);
      gstAmount = gst.total_gst;
      cgstAmount = gst.cgst_amount;
      sgstAmount = gst.sgst_amount;
      igstAmount = gst.igst_amount;
    }
    const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((totalAmount - advanceReceived) * 100) / 100);
    const status = balanceDue <= 0 ? 'PAID' : (advanceReceived > 0 ? 'PARTIAL' : 'PENDING');
    const dueDate = body.due_date || null;
    const invoiceNumber = await getNextInvoiceNumber(orgId);
    const gstin = body.gstin || null;

    const invoice = await Invoice.create({
      organization_id: orgId,
      case_id: caseId,
      invoice_number: invoiceNumber,
      gstin,
      amount: totalAmount,
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
      gst_amount: gstAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: totalAmount,
      balance_due: balanceDue
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

    const subtotal = FEE_FIELDS.reduce((s, k) => s + (Number({ professional_fee: professionalFee, filing_fee: filingFee, clerk_fee: clerkFee, court_fee: courtFee, misc_expense: miscExpense }[k]) || 0), 0);
    const isSameState = body.is_same_state !== false;
    let gstAmount = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    if (gstEnabled && gstPercentage > 0) {
      const gst = calculateGst(subtotal, gstPercentage, isSameState);
      gstAmount = gst.total_gst;
      cgstAmount = gst.cgst_amount;
      sgstAmount = gst.sgst_amount;
      igstAmount = gst.igst_amount;
    }
    const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((totalAmount - advanceReceived) * 100) / 100);
    const status = balanceDue <= 0 ? 'PAID' : (advanceReceived > 0 ? 'PARTIAL' : 'PENDING');

    await inv.update({
      case_id: caseId,
      amount: totalAmount,
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
      gst_amount: gstAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: totalAmount,
      balance_due: balanceDue
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

async function getInvoiceById(req, res, next) {
  try {
    const inv = await Invoice.findOne({
      where: { id: req.params.id, organization_id: req.user.organization_id },
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'] },
        { model: InvoiceItem, as: 'InvoiceItems', required: false },
        { model: Payment, as: 'Payments', required: false, order: [['payment_date', 'DESC'], ['id', 'DESC']] }
      ]
    });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const out = inv.toJSON();
    out.payment_status_display = getPaymentStatusDisplay(out);
    res.json({ success: true, data: out });
  } catch (err) { next(err); }
}

async function getInvoicePdf(req, res, next) {
  try {
    const buf = await generateInvoicePdf(req.params.id, req.user.organization_id);
    if (!buf) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`);
    res.send(buf);
  } catch (err) { next(err); }
}

/** UPI payload for QR: frontend can generate QR from upi_string. */
async function getInvoiceUpiPayload(req, res, next) {
  try {
    const inv = await Invoice.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const org = await Organization.findByPk(req.user.organization_id, { attributes: ['name', 'upi_id'] });
    const amount = Number(inv.balance_due) > 0 ? Number(inv.balance_due) : (Number(inv.total_amount) ?? Number(inv.amount) ?? 0);
    const upiId = (org && org.upi_id) ? String(org.upi_id).trim() : null;
    const pn = (org && org.name) ? encodeURIComponent(String(org.name).substring(0, 50)) : 'Merchant';
    const tn = encodeURIComponent(`Invoice ${inv.invoice_number || inv.id}`);
    const am = amount.toFixed(2);
    const upiString = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${pn}&am=${am}&tn=${tn}` : null;
    res.json({ success: true, data: { upi_string: upiString, amount, invoice_number: inv.invoice_number || inv.id, upi_id_set: !!upiId } });
  } catch (err) { next(err); }
}

async function recordPayment(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const inv = await Invoice.findOne({ where: { id: req.params.id, organization_id: orgId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (inv.subscription_id != null) return res.status(400).json({ success: false, message: 'Subscription invoices cannot receive manual payments' });
    const { amount, payment_date, transaction_id, upi_reference_id, method, notes } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    const currentPaid = Number(inv.advance_received) || 0;
    const totalAmount = Number(inv.total_amount) ?? Number(inv.amount) ?? 0;
    const newPaid = currentPaid + amt;
    const balanceDue = Math.max(0, Math.round((totalAmount - newPaid) * 100) / 100);
    const pay = await Payment.create({
      organization_id: orgId,
      invoice_id: inv.id,
      amount: amt,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      transaction_id: transaction_id || null,
      upi_reference_id: upi_reference_id || null,
      method: method || 'CASH',
      notes: notes || null
    });
    await inv.update({
      advance_received: newPaid,
      balance_due: balanceDue,
      status: balanceDue <= 0 ? 'PAID' : 'PARTIAL',
      paid_at: balanceDue <= 0 ? new Date() : inv.paid_at,
      payment_date: pay.payment_date,
      transaction_id: transaction_id || inv.transaction_id,
      upi_reference_id: upi_reference_id || inv.upi_reference_id
    });
    const out = inv.toJSON();
    out.payment_status_display = getPaymentStatusDisplay(out);
    res.json({ success: true, data: { invoice: out, payment: pay } });
  } catch (err) { next(err); }
}

async function getGstSummary(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { from_date, to_date } = req.query;
    const where = { organization_id: orgId, gst_enabled: true };
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = from_date;
      if (to_date) where.created_at[Op.lte] = to_date + ' 23:59:59';
    }
    const rows = await Invoice.findAll({ where, attributes: ['gst_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'invoice_number', 'created_at'] });
    let cgst = 0, sgst = 0, igst = 0, totalTaxable = 0;
    rows.forEach((r) => {
      cgst += Number(r.cgst_amount) || 0;
      sgst += Number(r.sgst_amount) || 0;
      igst += Number(r.igst_amount) || 0;
      totalTaxable += Number(r.total_amount) || 0;
    });
    res.json({ success: true, data: { cgst_total: Math.round(cgst * 100) / 100, sgst_total: Math.round(sgst * 100) / 100, igst_total: Math.round(igst * 100) / 100, total_taxable: Math.round(totalTaxable * 100) / 100, invoices: rows } });
  } catch (err) { next(err); }
}

async function listExpenses(req, res, next) {
  try {
    const { page = 1, limit = 50, case_id, category, from_date, to_date } = req.query;
    const where = { organization_id: req.user.organization_id };
    if (case_id) where.case_id = case_id;
    if (category) where.category = category;
    if (from_date || to_date) {
      where.expense_date = {};
      if (from_date) where.expense_date[Op.gte] = from_date;
      if (to_date) where.expense_date[Op.lte] = to_date;
    }
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Expense.findAndCountAll({ where, include: [{ model: Case, as: 'Case', attributes: ['id', 'case_number', 'case_title'], required: false }], order: [['expense_date', 'DESC']], limit: limitNum, offset });
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) { next(err); }
}

async function createExpense(req, res, next) {
  try {
    const { case_id, category, amount, expense_date, description, receipt_path } = req.body;
    if (!category || amount == null) return res.status(400).json({ success: false, message: 'Category and amount required' });
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const exp = await Expense.create({
      organization_id: req.user.organization_id,
      case_id: case_id || null,
      category,
      amount: amt,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      description: description || null,
      receipt_path: receipt_path || null,
      created_by: req.user.id
    });
    res.status(201).json({ success: true, data: exp });
  } catch (err) { next(err); }
}

async function updateExpense(req, res, next) {
  try {
    const exp = await Expense.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!exp) return res.status(404).json({ success: false, message: 'Expense not found' });
    const { case_id, category, amount, expense_date, description, receipt_path } = req.body;
    await exp.update({
      case_id: category !== undefined ? (case_id ?? exp.case_id) : exp.case_id,
      category: category ?? exp.category,
      amount: amount != null ? Number(amount) : exp.amount,
      expense_date: expense_date ?? exp.expense_date,
      description: description !== undefined ? description : exp.description,
      receipt_path: receipt_path !== undefined ? receipt_path : exp.receipt_path
    });
    res.json({ success: true, data: exp });
  } catch (err) { next(err); }
}

async function deleteExpense(req, res, next) {
  try {
    const exp = await Expense.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!exp) return res.status(404).json({ success: false, message: 'Expense not found' });
    await exp.destroy();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { next(err); }
}

async function getExpensesMonthlyReport(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const { year } = req.query;
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const exps = await Expense.findAll({ where: { organization_id: orgId }, attributes: ['amount', 'expense_date', 'category'] });
    const byMonth = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { month: m, total: 0, by_category: {} };
    exps.forEach((e) => {
      const d = e.expense_date ? new Date(e.expense_date) : null;
      if (!d || d.getFullYear() !== y) return;
      const m = d.getMonth() + 1;
      byMonth[m].total += Number(e.amount) || 0;
      const cat = e.category || 'Other';
      byMonth[m].by_category[cat] = (byMonth[m].by_category[cat] || 0) + (Number(e.amount) || 0);
    });
    const data = Object.values(byMonth).map((x) => ({ ...x, total: Math.round(x.total * 100) / 100 }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function listTdsRecords(req, res, next) {
  try {
    const where = { organization_id: req.user.organization_id };
    if (req.query.financial_year) where.financial_year = req.query.financial_year;
    const rows = await TdsRecord.findAll({ where, include: [{ model: Invoice, as: 'Invoice', attributes: ['id', 'invoice_number'] }, { model: Payment, as: 'Payment', attributes: ['id', 'amount'] }], order: [['deduction_date', 'DESC']] });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

async function createTdsRecord(req, res, next) {
  try {
    const { invoice_id, payment_id, amount, tds_amount, tds_percentage, financial_year, deduction_date } = req.body;
    const amt = Number(amount); const tds = Number(tds_amount);
    if (isNaN(amt) || amt < 0 || isNaN(tds) || tds < 0) return res.status(400).json({ success: false, message: 'Valid amount and tds_amount required' });
    const fy = financial_year || `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(-2)}`;
    const rec = await TdsRecord.create({
      organization_id: req.user.organization_id,
      invoice_id: invoice_id || null,
      payment_id: payment_id || null,
      amount: amt,
      tds_amount: tds,
      tds_percentage: tds_percentage || null,
      financial_year: fy,
      deduction_date: deduction_date || new Date().toISOString().slice(0, 10)
    });
    res.status(201).json({ success: true, data: rec });
  } catch (err) { next(err); }
}

async function getTdsYearlyStatement(req, res, next) {
  try {
    const fy = req.query.financial_year || `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(-2)}`;
    const rows = await TdsRecord.findAll({ where: { organization_id: req.user.organization_id, financial_year: fy }, include: [{ model: Invoice, as: 'Invoice' }, { model: Payment, as: 'Payment' }], order: [['deduction_date', 'ASC']] });
    const totalTds = rows.reduce((s, r) => s + (Number(r.tds_amount) || 0), 0);
    res.json({ success: true, data: { financial_year: fy, records: rows, total_tds: Math.round(totalTds * 100) / 100 } });
  } catch (err) { next(err); }
}

async function sendInvoiceReminder(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const channel = (req.body.channel || 'whatsapp').toLowerCase();
    const org = await Organization.findByPk(req.user.organization_id, { attributes: ['phone', 'email'] });
    const amount = String(invoice.total_amount ?? invoice.amount ?? '—');
    const dueDate = invoice.due_date || '—';
    if (channel === 'whatsapp' && org?.phone) {
      queueWhatsAppMessage(org.phone, 'payment_reminder', [amount, dueDate]);
    }
    if (channel === 'email' && org?.email) {
      // Placeholder: integrate your email service (nodemailer etc.)
    }
    if (channel === 'sms' && org?.phone) {
      // Placeholder: integrate SMS gateway
    }
    await auditService.log(req, { organization_id: req.user.organization_id, user_id: req.user.id, entity_type: 'INVOICE', entity_id: invoice.id, action_type: 'NOTIFY', module_name: 'BILLING', new_value: { channel }, action_summary: `Reminder (${channel}) sent for invoice #${invoice.id}.` });
    res.json({ success: true, message: `Reminder sent via ${channel}.` });
  } catch (err) { next(err); }
}

async function exportInvoicesCsv(req, res, next) {
  try {
    const invs = await Invoice.findAll({ where: { organization_id: req.user.organization_id }, include: [{ model: Case, as: 'Case', attributes: ['case_number'] }], order: [['created_at', 'DESC']] });
    const header = 'Invoice #,Case,Amount,Total,GST,Balance Due,Status,Due Date,Created\n';
    const rows = invs.map((i) => `${i.invoice_number || i.id},${(i.Case && i.Case.case_number) || ''},${i.amount},${i.total_amount ?? i.amount},${i.gst_amount || 0},${i.balance_due || 0},${i.status},${i.due_date || ''},${i.created_at}\n`).join('');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(header + rows);
  } catch (err) { next(err); }
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
  sendInvoiceReminderWhatsApp,
  getInvoiceById,
  getInvoicePdf,
  getInvoiceUpiPayload,
  recordPayment,
  getGstSummary,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesMonthlyReport,
  listTdsRecords,
  createTdsRecord,
  getTdsYearlyStatement,
  sendInvoiceReminder,
  exportInvoicesCsv
};
