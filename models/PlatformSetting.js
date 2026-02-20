const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');
const PlatformSetting = sequelize.define('PlatformSetting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'platform_settings', timestamps: true, underscored: true });
module.exports = PlatformSetting;
