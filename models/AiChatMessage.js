const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/db');

const AiChatMessage = sequelize.define('AiChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false },
  content: { type: DataTypes.TEXT('long'), allowNull: false },
  tokens_used: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'ai_chat_messages',
  timestamps: true,
  updatedAt: false,
  underscored: true
});

module.exports = AiChatMessage;
