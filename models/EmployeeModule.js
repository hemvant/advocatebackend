const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const EmployeeModule = sequelize.define('EmployeeModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  organization_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organization_users', key: 'id' }
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'id' }
  }
}, {
  tableName: 'employee_modules',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = EmployeeModule;
