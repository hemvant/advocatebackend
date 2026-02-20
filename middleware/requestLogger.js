const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](req.method + ' ' + (req.originalUrl || req.url) + ' ' + res.statusCode + ' ' + duration + 'ms', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent')
    });
  });
  next();
}

module.exports = requestLogger;
