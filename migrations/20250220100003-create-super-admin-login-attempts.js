'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('super_admin_login_attempts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      success: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('super_admin_login_attempts', ['email']);
    await queryInterface.addIndex('super_admin_login_attempts', ['created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('super_admin_login_attempts');
  }
};
