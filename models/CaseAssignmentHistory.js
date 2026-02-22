const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseAssignmentHistory = sequelize.define('CaseAssignmentHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  case_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'cases', key: 'id' }
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organization_users', key: 'id' }
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  unassigned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organization_users', key: 'id' }
  },
  reason: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'case_assignment_history',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CaseAssignmentHistory;
