const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const PackageModule = sequelize.define('PackageModule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  package_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'packages', key: 'id' }
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'id' }
  }
}, {
  tableName: 'package_modules',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PackageModule;
