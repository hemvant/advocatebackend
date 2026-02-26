'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_chat_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' } },
      title: { type: Sequelize.STRING(255), allowNull: false, defaultValue: 'New chat' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ai_chat_sessions', ['organization_id']);
    await queryInterface.addIndex('ai_chat_sessions', ['user_id']);

    await queryInterface.createTable('ai_chat_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      session_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'ai_chat_sessions', key: 'id', onDelete: 'CASCADE' } },
      role: { type: Sequelize.STRING(20), allowNull: false },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      tokens_used: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ai_chat_messages', ['session_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_chat_messages');
    await queryInterface.dropTable('ai_chat_sessions');
  }
};
