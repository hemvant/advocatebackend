const { SystemMetric, sequelize } = require('../models');
const { Op } = require('sequelize');

const processStartTime = Date.now();

async function getSystemHealth(req, res, next) {
  try {
    const [failedLogins, errorCount, dbPing] = await Promise.all([
      SystemMetric.sum('metric_value', { where: { metric_name: 'super_admin_failed_login', created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }).catch(() => null),
      SystemMetric.sum('metric_value', { where: { metric_name: 'system_error_count', created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }).catch(() => null),
      sequelize.authenticate().then(() => true).catch(() => false)
    ]);

    const uptimeSeconds = Math.floor((Date.now() - processStartTime) / 1000);

    res.json({
      success: true,
      data: {
        api_response_time_logging: 'active',
        failed_login_attempts_24h: Number(failedLogins || 0),
        system_error_count_24h: Number(errorCount || 0),
        server_uptime_seconds: uptimeSeconds,
        database_connected: dbPing,
        status: dbPing ? 'healthy' : 'degraded'
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSystemHealth };
