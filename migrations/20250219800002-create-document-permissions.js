'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_permissions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      document_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'case_documents', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' }, onDelete: 'CASCADE' },
      permission: { type: Sequelize.STRING(20), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('document_permissions', ['document_id']);
    await queryInterface.addIndex('document_permissions', ['user_id']);
    await queryInterface.addIndex('document_permissions', ['document_id', 'user_id'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('document_permissions');
  }
};
