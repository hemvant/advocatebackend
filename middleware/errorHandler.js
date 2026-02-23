const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) {
    try {
      const { SystemMetric } = require('../models');
      SystemMetric.create({ metric_name: 'system_error_count', metric_value: 1 }).catch(() => {});
    } catch (e) {}
  }
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
    ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack })
  });
};

module.exports = errorHandler;
