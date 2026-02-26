'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_usage_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
      feature_key: { type: Sequelize.STRING(80), allowNull: false },
      tokens_used: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estimated_cost: { type: Sequelize.DECIMAL(12, 6), allowNull: true },
      session_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'ai_chat_sessions', key: 'id', onDelete: 'SET NULL' } },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ai_usage_records', ['organization_id']);
    await queryInterface.addIndex('ai_usage_records', ['user_id']);
    await queryInterface.addIndex('ai_usage_records', ['created_at']);

    await queryInterface.createTable('ai_feature_requests', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
      feature_key: { type: Sequelize.STRING(80), allowNull: false },
      input_summary: { type: Sequelize.TEXT, allowNull: true },
      output_summary: { type: Sequelize.TEXT, allowNull: true },
      tokens_used: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ai_feature_requests', ['organization_id']);
    await queryInterface.addIndex('ai_feature_requests', ['created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_feature_requests');
    await queryInterface.dropTable('ai_usage_records');
  }
};
