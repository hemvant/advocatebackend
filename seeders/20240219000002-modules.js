'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('modules', [
      { name: 'Client Management', description: 'Manage clients and contacts', is_active: true, created_at: now },
      { name: 'Case Management', description: 'Track cases and matters', is_active: true, created_at: now },
      { name: 'Document Management', description: 'Store and organize documents', is_active: true, created_at: now },
      { name: 'Billing', description: 'Invoicing and payments', is_active: true, created_at: now },
      { name: 'Calendar', description: 'Schedule and appointments', is_active: true, created_at: now },
      { name: 'Reports', description: 'Analytics and reporting', is_active: true, created_at: now }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('modules', null, {});
  }
};
