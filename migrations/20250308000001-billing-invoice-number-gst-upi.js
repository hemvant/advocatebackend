'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const inv = 'invoices';
    const desc = await queryInterface.describeTable(inv).catch(() => ({}));
    if (!desc.invoice_number) {
      await queryInterface.addColumn(inv, 'invoice_number', { type: Sequelize.STRING(50), allowNull: true });
    }
    if (!desc.gstin) await queryInterface.addColumn(inv, 'gstin', { type: Sequelize.STRING(20), allowNull: true });
    if (!desc.cgst_amount) await queryInterface.addColumn(inv, 'cgst_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    if (!desc.sgst_amount) await queryInterface.addColumn(inv, 'sgst_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    if (!desc.igst_amount) await queryInterface.addColumn(inv, 'igst_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    if (!desc.payment_date) await queryInterface.addColumn(inv, 'payment_date', { type: Sequelize.DATEONLY, allowNull: true });
    if (!desc.upi_reference_id) await queryInterface.addColumn(inv, 'upi_reference_id', { type: Sequelize.STRING(100), allowNull: true });

    const org = 'organizations';
    const orgDesc = await queryInterface.describeTable(org).catch(() => ({}));
    if (!orgDesc.gstin) await queryInterface.addColumn(org, 'gstin', { type: Sequelize.STRING(20), allowNull: true });
    if (!orgDesc.upi_id) await queryInterface.addColumn(org, 'upi_id', { type: Sequelize.STRING(100), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'invoice_number').catch(() => {});
    await queryInterface.removeColumn('invoices', 'gstin').catch(() => {});
    await queryInterface.removeColumn('invoices', 'cgst_amount').catch(() => {});
    await queryInterface.removeColumn('invoices', 'sgst_amount').catch(() => {});
    await queryInterface.removeColumn('invoices', 'igst_amount').catch(() => {});
    await queryInterface.removeColumn('invoices', 'payment_date').catch(() => {});
    await queryInterface.removeColumn('invoices', 'upi_reference_id').catch(() => {});
    await queryInterface.removeColumn('organizations', 'gstin').catch(() => {});
    await queryInterface.removeColumn('organizations', 'upi_id').catch(() => {});
  }
};
