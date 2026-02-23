const { SystemMetric, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getUptimeSeconds } = require('../utils/serverStartTime');

const twentyFourHoursAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

async function getSystemHealth(req, res, next) {
  try {
    const [failedLogins, errorCount, dbPing] = await Promise.all([
      SystemMetric.sum('metric_value', { where: { metric_name: 'super_admin_failed_login', created_at: { [Op.gte]: twentyFourHoursAgo() } } }).catch(() => 0),
      SystemMetric.sum('metric_value', { where: { metric_name: 'system_error_count', created_at: { [Op.gte]: twentyFourHoursAgo() } } }).catch(() => 0),
      sequelize.authenticate().then(() => true).catch(() => false)
    ]);

    const uptimeSeconds = getUptimeSeconds();
    const database_connected = dbPing === true;
    const status = database_connected ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: {
        api_response_time_logging: 'active',
        failed_login_attempts_24h: Number(failedLogins || 0),
        system_error_count_24h: Number(errorCount || 0),
        server_uptime_seconds: uptimeSeconds,
        database_connected,
        status
      }
    });
  } catch (err) {
    const { getUptimeSeconds: uptime } = require('../utils/serverStartTime');
    res.status(200).json({
      success: true,
      data: {
        api_response_time_logging: 'active',
        failed_login_attempts_24h: 0,
        system_error_count_24h: 0,
        server_uptime_seconds: uptime(),
        database_connected: false,
        status: 'error',
        message: 'Could not compute full health status.'
      }
    });
  }
}

module.exports = { getSystemHealth };
