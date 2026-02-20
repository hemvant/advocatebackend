const { sequelize, Organization, OrganizationUser, Client, Case, CaseHearing, CaseDocument, Invoice, Subscription, AuditLog, OrganizationModule, Module } = require('../models');
const { Op } = require('sequelize');

async function getSummary(req, res, next) {
  try {
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      totalOrgUsers,
      totalClients,
      totalCases,
      totalHearings,
      totalDocuments,
      revenueResult,
      activeSubs,
      expiringSubs
    ] = await Promise.all([
      Organization.count(),
      Organization.count({ where: { is_active: true } }),
      Organization.count({ where: { is_active: false } }),
      OrganizationUser.count(),
      Client.count({ where: { is_deleted: false } }),
      Case.count({ where: { is_deleted: false } }),
      CaseHearing.count(),
      CaseDocument.count({ where: { is_deleted: false } }),
      Invoice.sum('amount', { where: { status: 'PAID' } }),
      Subscription.count({ where: { status: 'ACTIVE' } }),
      Subscription.count({
        where: {
          status: 'ACTIVE',
          expires_at: { [Op.and]: [{ [Op.gte]: new Date() }, { [Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }] }
        }
      })
    ]);

    const totalRevenue = Number(revenueResult || 0);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      Invoice.sum('amount', { where: { status: 'PAID', paid_at: { [Op.gte]: startOfMonth } } }),
      Invoice.sum('amount', { where: { status: 'PAID', paid_at: { [Op.gte]: startOfLastMonth, [Op.lte]: endOfLastMonth } } })
    ]);
    const thisMonth = Number(thisMonthRevenue || 0);
    const lastMonth = Number(lastMonthRevenue || 0);
    const monthlyGrowth = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : (thisMonth > 0 ? '100' : '0');

    res.json({
      success: true,
      data: {
        total_organizations: totalOrgs,
        active_organizations: activeOrgs,
        suspended_organizations: suspendedOrgs,
        total_organization_users: totalOrgUsers,
        total_clients: totalClients,
        total_cases: totalCases,
        total_hearings: totalHearings,
        total_documents: totalDocuments,
        total_revenue: totalRevenue,
        monthly_revenue_growth_percent: parseFloat(monthlyGrowth),
        active_subscriptions: activeSubs,
        expiring_subscriptions_7_days: expiringSubs
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
