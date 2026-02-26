'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_prompt_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      feature_key: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      system_prompt: { type: Sequelize.TEXT('long'), allowNull: true },
      user_prompt_format: { type: Sequelize.TEXT('long'), allowNull: true },
      temperature: { type: Sequelize.DECIMAL(3, 2), allowNull: true, defaultValue: 0.3 },
      max_tokens: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 4096 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ai_prompt_templates');
  }
};
