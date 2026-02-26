'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tds_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      invoice_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'invoices', key: 'id' }, onDelete: 'SET NULL' },
      payment_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payments', key: 'id' }, onDelete: 'SET NULL' },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tds_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tds_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      financial_year: { type: Sequelize.STRING(9), allowNull: true },
      deduction_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('tds_records', ['organization_id']);
    await queryInterface.addIndex('tds_records', ['financial_year']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tds_records');
  }
};
