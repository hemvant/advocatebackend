const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const M = sequelize.define('ImpersonationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  super_admin_id: { type: DataTypes.INTEGER, allowNull: false },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  organization_user_id: { type: DataTypes.INTEGER, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: false },
  ended_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'impersonation_logs', timestamps: false });
module.exports = M;
