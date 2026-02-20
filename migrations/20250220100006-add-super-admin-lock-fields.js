'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('super_admins', 'failed_login_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('super_admins', 'locked_until', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('super_admins', 'last_login_ip', { type: Sequelize.STRING(45), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('super_admins', 'failed_login_count');
    await queryInterface.removeColumn('super_admins', 'locked_until');
    await queryInterface.removeColumn('super_admins', 'last_login_ip');
  }
};
