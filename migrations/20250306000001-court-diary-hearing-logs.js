'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hearing_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      hearing_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'case_hearings', key: 'id' } },
      old_hearing_date: { type: Sequelize.DATE, allowNull: true },
      new_hearing_date: { type: Sequelize.DATE, allowNull: true },
      changed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organization_users', key: 'id' } },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('hearing_logs', ['organization_id']);
    await queryInterface.addIndex('hearing_logs', ['hearing_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hearing_logs');
  }
};
