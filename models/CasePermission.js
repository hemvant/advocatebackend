const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CasePermission = sequelize.define('CasePermission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  case_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  permission: { type: DataTypes.STRING(20), allowNull: false }
}, {
  tableName: 'case_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CasePermission;
