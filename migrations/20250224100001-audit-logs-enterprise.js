'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'audit_logs';
    const desc = await queryInterface.describeTable(table).catch(() => ({}));

    if (!desc.user_name) await queryInterface.addColumn(table, 'user_name', { type: Sequelize.STRING(255), allowNull: true });
    if (!desc.user_role) await queryInterface.addColumn(table, 'user_role', { type: Sequelize.STRING(50), allowNull: true });
    if (!desc.module_name) await queryInterface.addColumn(table, 'module_name', { type: Sequelize.STRING(100), allowNull: true });
    if (!desc.action_summary) await queryInterface.addColumn(table, 'action_summary', { type: Sequelize.TEXT, allowNull: true });
    if (!desc.user_agent) await queryInterface.addColumn(table, 'user_agent', { type: Sequelize.STRING(500), allowNull: true });
    if (!desc.log_hash) await queryInterface.addColumn(table, 'log_hash', { type: Sequelize.STRING(64), allowNull: true });

    await queryInterface.addIndex(table, ['entity_id'], { name: 'audit_logs_entity_id_idx' }).catch(() => {});
    await queryInterface.addIndex(table, ['module_name'], { name: 'audit_logs_module_name_idx' }).catch(() => {});
  },

  async down(queryInterface) {
    const table = 'audit_logs';
    await queryInterface.removeIndex(table, 'audit_logs_module_name_idx').catch(() => {});
    await queryInterface.removeIndex(table, 'audit_logs_entity_id_idx').catch(() => {});
    await queryInterface.removeColumn(table, 'log_hash').catch(() => {});
    await queryInterface.removeColumn(table, 'user_agent').catch(() => {});
    await queryInterface.removeColumn(table, 'action_summary').catch(() => {});
    await queryInterface.removeColumn(table, 'module_name').catch(() => {});
    await queryInterface.removeColumn(table, 'user_role').catch(() => {});
    await queryInterface.removeColumn(table, 'user_name').catch(() => {});
  }
};
