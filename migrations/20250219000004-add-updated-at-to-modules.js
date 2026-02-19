'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('modules');
    if (!table.updated_at) {
      await queryInterface.addColumn('modules', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('modules', 'updated_at');
  }
};
