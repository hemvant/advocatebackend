const winston = require('winston');
const path = require('path');

const logDir = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level: lvl, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return timestamp + ' [' + lvl + '] ' + message + metaStr;
      })
    )
  })
];

if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE !== 'false') {
  try {
    const fs = require('fs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: winston.format.combine(winston.format.timestamp(), winston.format.json())
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json())
      })
    );
  } catch (e) {}
}

const logger = winston.createLogger({
  level,
  transports,
  exitOnError: false
});

module.exports = logger;
