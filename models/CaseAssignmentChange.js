const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const CaseAssignmentChange = sequelize.define('CaseAssignmentChange', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
  case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'cases', key: 'id' } },
  previous_assigned_to: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
  new_assigned_to: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' } },
  changed_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' } },
  change_reason: { type: DataTypes.STRING(500), allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'case_assignment_changes',
  timestamps: false,
  underscored: true
});

module.exports = CaseAssignmentChange;
