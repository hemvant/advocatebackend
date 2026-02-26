const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const HearingLog = sequelize.define('HearingLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  hearing_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'case_hearings', key: 'id' } },
  old_hearing_date: { type: DataTypes.DATE, allowNull: true },
  new_hearing_date: { type: DataTypes.DATE, allowNull: true },
  changed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
  reason: { type: DataTypes.STRING(500), allowNull: true }
}, {
  tableName: 'hearing_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = HearingLog;
