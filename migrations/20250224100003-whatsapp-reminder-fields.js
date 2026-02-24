'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('case_hearings', 'whatsapp_reminder_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('invoices', 'payment_reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('organization_users', 'phone', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('case_hearings', 'whatsapp_reminder_sent');
    await queryInterface.removeColumn('invoices', 'payment_reminder_sent_at');
    await queryInterface.removeColumn('organization_users', 'phone');
  }
};
