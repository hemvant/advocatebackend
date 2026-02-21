const { Organization, OrganizationUser, Module, Client, Case, Invoice, AuditLog, Subscription, Package, ImpersonationLog } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');

async function listOrganizations(req, res, next) {
  try {
    const { status, subscription_plan, from_date, to_date, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status === 'active') where.is_active = true;
    if (status === 'suspended') where.is_active = false;
    if (subscription_plan && subscription_plan.trim()) where.subscription_plan = subscription_plan.trim();
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: '%' + search.trim() + '%' } },
        { email: { [Op.like]: '%' + search.trim() + '%' } }
      ];
    }
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await Organization.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });
    res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) } });
  } catch (err) {
    next(err);
  }
}

async function getOrganizationDetail(req, res, next) {
  try {
    const org = await Organization.findByPk(req.params.id, {
      include: [
        { model: OrganizationUser, as: 'OrganizationUsers', attributes: { exclude: ['password'] } },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ]
    });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const [clientCount, caseCount, revenueSum, recentAudit] = await Promise.all([
      Client.count({ where: { organization_id: org.id, is_deleted: false } }),
      Case.count({ where: { organization_id: org.id, is_deleted: false } }),
      Invoice.sum('amount', { where: { organization_id: org.id, status: 'PAID' } }),
      AuditLog.findAll({ where: { organization_id: org.id }, order: [['created_at', 'DESC']], limit: 20, include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'], required: false }] })
    ]);
    const employeeCount = await OrganizationUser.count({ where: { organization_id: org.id } });
    const activeSubs = await Subscription.count({ where: { organization_id: org.id, status: 'ACTIVE' } });
    const activeSubscription = await Subscription.findOne({
      where: { organization_id: org.id, status: 'ACTIVE' },
      include: [{ model: Package, as: 'Package', attributes: ['id', 'name', 'employee_limit', 'price_monthly', 'price_annual'], required: false }],
      order: [['id', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        organization: org.toJSON(),
        client_count: clientCount,
        case_count: caseCount,
        employee_count: employeeCount,
        revenue_total: Number(revenueSum || 0),
        active_subscriptions: activeSubs,
        active_subscription: activeSubscription ? activeSubscription.toJSON() : null,
        recent_audit_logs: recentAudit,
        module_usage: (org.Modules || []).map((m) => m.name)
      }
    });
  } catch (err) {
    next(err);
  }
}

async function impersonate(req, res, next) {
  try {
    const orgId = parseInt(req.params.organizationId, 10);
    const org = await Organization.findByPk(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    const admin = await OrganizationUser.findOne({ where: { organization_id: orgId, role: 'ORG_ADMIN', is_active: true } });
    if (!admin) return res.status(404).json({ success: false, message: 'No active org admin found' });

    const ip = req.ip || req.connection && req.connection.remoteAddress || null;
    await ImpersonationLog.create({
      super_admin_id: req.superAdmin.id,
      organization_id: orgId,
      organization_user_id: admin.id,
      ip_address: ip,
      started_at: new Date()
    });

    const token = jwt.sign(
      { type: 'org_user', id: admin.id, organization_id: orgId },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
    res.cookie(config.jwt.cookieName, token, { ...config.cookieOptions, maxAge: 60 * 60 * 1000 });
    res.json({ success: true, token, redirect: '/dashboard', message: 'Impersonation started' });
  } catch (err) {
    next(err);
  }
}

async function resetOrgAdminPassword(req, res, next) {
  try {
    const orgId = parseInt(req.params.id, 10);
    const org = await Organization.findByPk(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    const admin = await OrganizationUser.findOne({ where: { organization_id: orgId, role: 'ORG_ADMIN' } });
    if (!admin) return res.status(404).json({ success: false, message: 'Org admin user not found' });
    const newPassword = req.body.new_password;
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await admin.update({ password: hashed });
    res.json({ success: true, message: 'Org admin password reset successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrganizations, getOrganizationDetail, impersonate, resetOrgAdminPassword };
