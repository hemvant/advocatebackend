const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiChatSession = sequelize.define('AiChatSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'New chat' }
}, {
  tableName: 'ai_chat_sessions',
  timestamps: true,
  underscored: true
});

module.exports = AiChatSession;
