'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'professional_fee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'filing_fee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'clerk_fee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'court_fee', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'misc_expense', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'advance_received', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'gst_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('invoices', 'gst_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'gst_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await queryInterface.addColumn('invoices', 'total_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });
    await queryInterface.addColumn('invoices', 'balance_due', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });
    await queryInterface.addColumn('invoices', 'case_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'cases', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoices', 'case_id');
    await queryInterface.removeColumn('invoices', 'balance_due');
    await queryInterface.removeColumn('invoices', 'total_amount');
    await queryInterface.removeColumn('invoices', 'gst_amount');
    await queryInterface.removeColumn('invoices', 'gst_percentage');
    await queryInterface.removeColumn('invoices', 'gst_enabled');
    await queryInterface.removeColumn('invoices', 'advance_received');
    await queryInterface.removeColumn('invoices', 'misc_expense');
    await queryInterface.removeColumn('invoices', 'court_fee');
    await queryInterface.removeColumn('invoices', 'clerk_fee');
    await queryInterface.removeColumn('invoices', 'filing_fee');
    await queryInterface.removeColumn('invoices', 'professional_fee');
  }
};
