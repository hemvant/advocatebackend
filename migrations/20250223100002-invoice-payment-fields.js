'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const invDesc = await queryInterface.describeTable('invoices').catch(() => ({}));
    if (!invDesc.gateway_order_id) {
      await queryInterface.addColumn('invoices', 'gateway_order_id', { type: Sequelize.STRING(100), allowNull: true });
    }
    if (!invDesc.payment_id) {
      await queryInterface.addColumn('invoices', 'payment_id', { type: Sequelize.STRING(100), allowNull: true });
    }
    if (!invDesc.transaction_id) {
      await queryInterface.addColumn('invoices', 'transaction_id', { type: Sequelize.STRING(100), allowNull: true });
    }
  },
  async down(queryInterface) {
    const invDesc = await queryInterface.describeTable('invoices').catch(() => ({}));
    if (invDesc.transaction_id) await queryInterface.removeColumn('invoices', 'transaction_id');
    if (invDesc.payment_id) await queryInterface.removeColumn('invoices', 'payment_id');
    if (invDesc.gateway_order_id) await queryInterface.removeColumn('invoices', 'gateway_order_id');
  }
};
