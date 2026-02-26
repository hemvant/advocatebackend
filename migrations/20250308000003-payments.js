'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      invoice_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'invoices', key: 'id' }, onDelete: 'CASCADE' },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_date: { type: Sequelize.DATEONLY, allowNull: true },
      transaction_id: { type: Sequelize.STRING(100), allowNull: true },
      upi_reference_id: { type: Sequelize.STRING(100), allowNull: true },
      method: { type: Sequelize.STRING(30), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('payments', ['organization_id']);
    await queryInterface.addIndex('payments', ['invoice_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};
