const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CHANNELS = ['SMS', 'WHATSAPP', 'EMAIL', 'SYSTEM'];
const STATUSES = ['PENDING', 'SENT', 'FAILED'];

const NotificationLog = sequelize.define('NotificationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  hearing_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'case_hearings', key: 'id' } },
  notification_type: { type: DataTypes.STRING(50), allowNull: false },
  channel: { type: DataTypes.ENUM(...CHANNELS), allowNull: false, defaultValue: 'SYSTEM' },
  recipient: { type: DataTypes.STRING(255), allowNull: true },
  subject: { type: DataTypes.STRING(255), allowNull: true },
  body_preview: { type: DataTypes.TEXT('long'), allowNull: true },
  status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'PENDING' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  error_message: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'notification_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

NotificationLog.CHANNELS = CHANNELS;
NotificationLog.STATUSES = STATUSES;
module.exports = NotificationLog;
