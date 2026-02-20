'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('impersonation_logs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      super_admin_id: { type: Sequelize.INTEGER, allowNull: false },
      organization_id: { type: Sequelize.INTEGER, allowNull: false },
      organization_user_id: { type: Sequelize.INTEGER, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: false },
      ended_at: { type: Sequelize.DATE, allowNull: true }
    });
    await queryInterface.addIndex('impersonation_logs', ['super_admin_id']);
    await queryInterface.addIndex('impersonation_logs', ['organization_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('impersonation_logs');
  }
};
