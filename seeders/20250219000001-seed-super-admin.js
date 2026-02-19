'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const rows = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as c FROM super_admins',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const total = (rows[0] && rows[0].c) ? Number(rows[0].c) : 0;
    if (total > 0) return;
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123', salt);
    const now = new Date();
    await queryInterface.bulkInsert('super_admins', [
      {
        name: 'Platform Owner',
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@advocatelearn.com',
        password,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('super_admins', { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@advocatelearn.com' }, {});
  }
};
