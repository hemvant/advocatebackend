'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_tasks', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' }, onDelete: 'CASCADE' },
      case_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cases', key: 'id' }, onDelete: 'CASCADE' },
      assigned_to: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' }, onDelete: 'SET NULL' },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' }, onDelete: 'SET NULL' },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'MEDIUM' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDING' },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('case_tasks', ['organization_id']);
    await queryInterface.addIndex('case_tasks', ['case_id']);
    await queryInterface.addIndex('case_tasks', ['assigned_to']);
    await queryInterface.addIndex('case_tasks', ['status']);
    await queryInterface.addIndex('case_tasks', ['due_date']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('case_tasks');
  }
};
