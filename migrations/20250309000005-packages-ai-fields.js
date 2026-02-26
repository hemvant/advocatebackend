'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('packages').catch(() => ({}));
    if (!desc.ai_monthly_token_limit) {
      await queryInterface.addColumn('packages', 'ai_monthly_token_limit', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
    }
    if (!desc.ai_features) {
      await queryInterface.addColumn('packages', 'ai_features', { type: Sequelize.TEXT, allowNull: true });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('packages', 'ai_monthly_token_limit').catch(() => {});
    await queryInterface.removeColumn('packages', 'ai_features').catch(() => {});
  }
};
