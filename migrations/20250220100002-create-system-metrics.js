'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_metrics', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      metric_name: { type: Sequelize.STRING(100), allowNull: false },
      metric_value: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('system_metrics', ['metric_name'], { name: 'system_metrics_name_idx' });
    await queryInterface.addIndex('system_metrics', ['created_at'], { name: 'system_metrics_created_idx' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('system_metrics');
  }
};
