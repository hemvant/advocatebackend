const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseTask = sequelize.define('CaseTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'cases', key: 'id' } },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
  created_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDING' },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'case_tasks',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CaseTask;
