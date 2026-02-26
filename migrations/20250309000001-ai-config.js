'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_config', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      provider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'sarvam' },
      encrypted_api_key: { type: Sequelize.TEXT, allowNull: true },
      api_key_masked: { type: Sequelize.STRING(20), allowNull: true },
      base_url: { type: Sequelize.STRING(500), allowNull: true },
      rate_limit_per_user_per_min: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      rate_limit_org_daily: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 500 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_config');
  }
};
