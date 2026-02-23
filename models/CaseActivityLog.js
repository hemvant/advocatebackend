const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseActivityLog = sequelize.define('CaseActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'cases', key: 'id' } },
  task_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'case_tasks', key: 'id' } },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' } },
  activity_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  activity_summary: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'case_activity_logs',
  timestamps: false,
  underscored: true
});

const ACTIVITY_TYPES = Object.freeze([
  'CASE_CREATED', 'CASE_UPDATED', 'CASE_ASSIGNED', 'CASE_REASSIGNED',
  'TASK_CREATED', 'TASK_UPDATED', 'TASK_ASSIGNED', 'TASK_REASSIGNED',
  'TASK_STARTED', 'TASK_COMPLETED', 'STATUS_CHANGED'
]);
CaseActivityLog.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports = CaseActivityLog;
