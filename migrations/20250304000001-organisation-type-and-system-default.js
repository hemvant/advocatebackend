'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (!desc.is_system_default) {
      await queryInterface.addColumn('organizations', 'is_system_default', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (desc.is_system_default) {
      await queryInterface.removeColumn('organizations', 'is_system_default');
    }
  }
};
