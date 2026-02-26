const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiFeatureRequest = sequelize.define('AiFeatureRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  feature_key: { type: DataTypes.STRING(80), allowNull: false },
  input_summary: { type: DataTypes.TEXT, allowNull: true },
  output_summary: { type: DataTypes.TEXT, allowNull: true },
  tokens_used: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'ai_feature_requests',
  timestamps: true,
  updatedAt: false,
  underscored: true
});

module.exports = AiFeatureRequest;
