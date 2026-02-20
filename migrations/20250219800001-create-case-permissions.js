'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_permissions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      case_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'cases', key: 'id' }, onDelete: 'CASCADE' },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organization_users', key: 'id' }, onDelete: 'CASCADE' },
      permission: { type: Sequelize.STRING(20), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('case_permissions', ['case_id']);
    await queryInterface.addIndex('case_permissions', ['user_id']);
    await queryInterface.addIndex('case_permissions', ['case_id', 'user_id'], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('case_permissions');
  }
};
