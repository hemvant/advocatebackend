'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      organization_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'organizations', key: 'id' } },
      hearing_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'case_hearings', key: 'id' } },
      notification_type: { type: Sequelize.STRING(50), allowNull: false },
      channel: { type: Sequelize.ENUM('SMS', 'WHATSAPP', 'EMAIL', 'SYSTEM'), allowNull: false, defaultValue: 'SYSTEM' },
      recipient: { type: Sequelize.STRING(255), allowNull: true },
      subject: { type: Sequelize.STRING(255), allowNull: true },
      body_preview: { type: Sequelize.TEXT('long'), allowNull: true },
      status: { type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'), allowNull: false, defaultValue: 'PENDING' },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      error_message: { type: Sequelize.TEXT('long'), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('notification_logs', ['organization_id']);
    await queryInterface.addIndex('notification_logs', ['hearing_id']);
    await queryInterface.addIndex('notification_logs', ['channel', 'sent_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_logs');
  }
};
