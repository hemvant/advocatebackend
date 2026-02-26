'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stamp_duty_config', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'organizations', key: 'id' } },
      state: { type: Sequelize.STRING(100), allowNull: false },
      document_type: { type: Sequelize.STRING(50), allowNull: false },
      rate_type: { type: Sequelize.ENUM('PERCENTAGE', 'FIXED'), allowNull: false, defaultValue: 'FIXED' },
      rate_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      min_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      max_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('stamp_duty_config', ['organization_id']);
    await queryInterface.addIndex('stamp_duty_config', ['state', 'document_type']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('stamp_duty_config');
  }
};
