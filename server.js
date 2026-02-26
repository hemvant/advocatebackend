require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { testConnection } = require('./utils/db');
const { initReminderCron } = require('./utils/reminderJob');
const { initECourtSyncCron } = require('./utils/ecourtSyncJob');
const { initWhatsAppReminderCron } = require('./utils/whatsappReminderJob');
const { initCourtDiaryReminderCron } = require('./utils/courtDiaryReminderJob');
const logger = require('./utils/logger');
const { UPLOAD_BASE, ensureDir } = require('./config/uploads');

require('./models');

// Ensure upload folder exists before server accepts requests (document uploads)
ensureDir(UPLOAD_BASE);
logger.info('Upload directory ready: ' + UPLOAD_BASE);

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors(config.cors));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

app.use('/api', routes);

app.use(errorHandler);

const { setProcessStartTime } = require('./utils/serverStartTime');

testConnection().then(function() {
  initReminderCron();
  initECourtSyncCron();
  initWhatsAppReminderCron();
  initCourtDiaryReminderCron();
  app.listen(config.port, '0.0.0.0', function() {
    setProcessStartTime();
    logger.info('Server running on port ' + config.port + ' (all interfaces)');
  });
}).catch(function() { process.exit(1); });