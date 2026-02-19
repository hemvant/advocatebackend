const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const OrganizationModule = sequelize.define('OrganizationModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' }
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'id' }
  }
}, {
  tableName: 'organization_modules',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = OrganizationModule;
