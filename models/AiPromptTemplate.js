const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiPromptTemplate = sequelize.define('AiPromptTemplate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  feature_key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  system_prompt: { type: DataTypes.TEXT('long'), allowNull: true },
  user_prompt_format: { type: DataTypes.TEXT('long'), allowNull: true },
  temperature: { type: DataTypes.DECIMAL(3, 2), allowNull: true, defaultValue: 0.3 },
  max_tokens: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 4096 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'ai_prompt_templates',
  timestamps: true,
  underscored: true
});

module.exports = AiPromptTemplate;
