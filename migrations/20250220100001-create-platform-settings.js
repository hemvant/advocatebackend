'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_settings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('platform_settings', ['key'], { unique: true, name: 'platform_settings_key_unique' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('platform_settings');
  }
};
