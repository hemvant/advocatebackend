const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const OrganizationSetupProgress = sequelize.define('OrganizationSetupProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'organizations', key: 'id' }
  },
  has_clients: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  has_courts: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  has_judges: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  has_cases: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_initial_setup_complete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'organization_setup_progress',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = OrganizationSetupProgress;
