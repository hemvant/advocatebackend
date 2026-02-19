require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { testConnection } = require('./utils/db');
const { initReminderCron } = require('./utils/reminderJob');

require('./models');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', routes);

app.use(errorHandler);

testConnection().then(() => {
  initReminderCron();
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}).catch(() => process.exit(1));
