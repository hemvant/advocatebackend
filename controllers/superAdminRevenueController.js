const { Invoice, sequelize } = require('../models');
const { Op } = require('sequelize');

async function getRevenueSummary(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const totalRevenue = await Invoice.sum('amount', { where: { status: 'PAID' } });
    const thisMonthRevenue = await Invoice.sum('amount', { where: { status: 'PAID', paid_at: { [Op.gte]: startOfMonth } } });
    const lastMonthRevenue = await Invoice.sum('amount', { where: { status: 'PAID', paid_at: { [Op.gte]: startOfLastMonth, [Op.lte]: endOfLastMonth } } });
    const byPlanRows = await sequelize.query(
      "SELECT o.subscription_plan AS plan, COALESCE(SUM(i.amount), 0) AS total FROM organizations o LEFT JOIN invoices i ON i.organization_id = o.id AND i.status = 'PAID' WHERE o.subscription_plan IS NOT NULL AND o.subscription_plan != '' GROUP BY o.subscription_plan",
      { type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);
    const byOrgRows = await sequelize.query(
      "SELECT o.id, o.name, COALESCE(SUM(i.amount), 0) AS total FROM organizations o LEFT JOIN invoices i ON i.organization_id = o.id AND i.status = 'PAID' GROUP BY o.id, o.name HAVING total > 0 ORDER BY total DESC",
      { type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    const total = Number(totalRevenue || 0);
    const thisMonth = Number(thisMonthRevenue || 0);
    const lastMonth = Number(lastMonthRevenue || 0);
    const growthPercent = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : (thisMonth > 0 ? '100' : '0');

    res.json({
      success: true,
      data: {
        total_revenue: total,
        revenue_this_month: thisMonth,
        revenue_last_month: lastMonth,
        growth_percent: parseFloat(growthPercent),
        revenue_by_plan: byPlanRows.map((r) => ({ plan: r.plan || 'N/A', total: Number(r.total) })),
        revenue_by_organization: byOrgRows.map((r) => ({ organization_id: r.id, organization_name: r.name, total: Number(r.total) }))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getRevenueSummary };
