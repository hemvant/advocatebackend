const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiConfig = sequelize.define('AiConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'sarvam' },
  encrypted_api_key: { type: DataTypes.TEXT, allowNull: true },
  api_key_masked: { type: DataTypes.STRING(20), allowNull: true },
  base_url: { type: DataTypes.STRING(500), allowNull: true },
  rate_limit_per_user_per_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  rate_limit_org_daily: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'ai_config',
  timestamps: true,
  underscored: true
});

module.exports = AiConfig;
