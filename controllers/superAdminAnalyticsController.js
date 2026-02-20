const { sequelize, Case, AuditLog } = require('../models');
const { Op } = require('sequelize');

async function getCharts(req, res, next) {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const orgGrowthRows = await sequelize.query('SELECT DATE_FORMAT(created_at, \'%Y-%m\') AS month, COUNT(*) AS count FROM organizations WHERE created_at >= :start GROUP BY month ORDER BY month', { replacements: { start: twelveMonthsAgo }, type: sequelize.QueryTypes.SELECT }).catch(() => []);
    const revenueRows = await sequelize.query('SELECT DATE_FORMAT(paid_at, \'%Y-%m\') AS month, COALESCE(SUM(amount), 0) AS total FROM invoices WHERE status = \'PAID\' AND paid_at >= :start GROUP BY month ORDER BY month', { replacements: { start: twelveMonthsAgo }, type: sequelize.QueryTypes.SELECT }).catch(() => []);
    const caseStatusRows = await Case.findAll({ where: { is_deleted: false }, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true }).catch(() => []);
    const topOrgsByCase = await sequelize.query('SELECT o.id, o.name, COUNT(c.id) AS case_count FROM organizations o LEFT JOIN cases c ON c.organization_id = o.id AND c.is_deleted = 0 GROUP BY o.id, o.name ORDER BY case_count DESC LIMIT 10', { type: sequelize.QueryTypes.SELECT }).catch(() => []);
    const topOrgsByRevenue = await sequelize.query('SELECT o.id, o.name, COALESCE(SUM(i.amount), 0) AS total FROM organizations o LEFT JOIN invoices i ON i.organization_id = o.id AND i.status = \'PAID\' GROUP BY o.id, o.name ORDER BY total DESC LIMIT 10', { type: sequelize.QueryTypes.SELECT }).catch(() => []);
    const moduleUsageRows = await sequelize.query('SELECT m.name, COUNT(om.organization_id) AS usage_count FROM modules m LEFT JOIN organization_modules om ON om.module_id = m.id GROUP BY m.id, m.name ORDER BY usage_count DESC', { type: sequelize.QueryTypes.SELECT }).catch(() => []);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dau = await AuditLog.count({ where: { created_at: { [Op.gte]: todayStart } }, distinct: true, col: 'user_id' }).catch(() => 0);
    const mau = await AuditLog.count({ where: { created_at: { [Op.gte]: thirtyDaysAgo } }, distinct: true, col: 'user_id' }).catch(() => 0);

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7.push(d.toISOString().slice(0, 10));
    }
    const heatmapCounts = await Promise.all(last7.map((day) => {
      const start = new Date(day);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      return AuditLog.count({ where: { created_at: { [Op.between]: [start, end] } } }).catch(() => 0);
    }));

    res.json({
      success: true,
      data: {
        monthly_organization_growth: { labels: orgGrowthRows.map((r) => r.month), datasets: [{ label: 'Organizations', data: orgGrowthRows.map((r) => Number(r.count)) }] },
        monthly_revenue_growth: { labels: revenueRows.map((r) => r.month), datasets: [{ label: 'Revenue', data: revenueRows.map((r) => Number(r.total)) }] },
        cases_by_status: { labels: caseStatusRows.map((r) => r.status), datasets: [{ label: 'Cases', data: caseStatusRows.map((r) => Number(r.count)) }] },
        top_10_organizations_by_case: { labels: topOrgsByCase.map((r) => r.name), datasets: [{ label: 'Cases', data: topOrgsByCase.map((r) => Number(r.case_count)) }] },
        top_10_organizations_by_revenue: { labels: topOrgsByRevenue.map((r) => r.name), datasets: [{ label: 'Revenue', data: topOrgsByRevenue.map((r) => Number(r.total)) }] },
        module_usage: { labels: moduleUsageRows.map((r) => r.name), datasets: [{ label: 'Organizations', data: moduleUsageRows.map((r) => Number(r.usage_count)) }] },
        platform_activity_heatmap: { labels: last7, datasets: [{ label: 'Activity', data: heatmapCounts }] },
        dau,
        mau
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCharts };
