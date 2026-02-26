'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      case_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cases', key: 'id' }, onDelete: 'SET NULL' },
      category: { type: Sequelize.STRING(100), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      expense_date: { type: Sequelize.DATEONLY, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      receipt_path: { type: Sequelize.STRING(500), allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('expenses', ['organization_id']);
    await queryInterface.addIndex('expenses', ['case_id']);
    await queryInterface.addIndex('expenses', ['expense_date']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  }
};
