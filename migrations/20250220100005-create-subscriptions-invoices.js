'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false },
      plan: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      started_at: { type: Sequelize.DATE, allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('subscriptions', ['organization_id']);
    await queryInterface.addIndex('subscriptions', ['status', 'expires_at']);

    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDING' },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('invoices', ['organization_id']);
    await queryInterface.addIndex('invoices', ['status', 'created_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
    await queryInterface.dropTable('subscriptions');
  }
};
