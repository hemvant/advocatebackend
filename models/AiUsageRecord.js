const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiUsageRecord = sequelize.define('AiUsageRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  feature_key: { type: DataTypes.STRING(80), allowNull: false },
  tokens_used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  estimated_cost: { type: DataTypes.DECIMAL(12, 6), allowNull: true },
  session_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'ai_usage_records',
  timestamps: true,
  updatedAt: false,
  underscored: true
});

module.exports = AiUsageRecord;
