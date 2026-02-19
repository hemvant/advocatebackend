'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      { name: 'SUPER_ADMIN', created_at: new Date() },
      { name: 'ADMIN', created_at: new Date() },
      { name: 'USER', created_at: new Date() }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
