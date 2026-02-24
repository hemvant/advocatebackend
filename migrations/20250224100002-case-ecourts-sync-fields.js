'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'cnr_number', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addColumn('cases', 'auto_sync_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn('cases', 'last_synced_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('cases', 'external_status', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('cases', 'external_next_hearing_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cases', 'external_next_hearing_date');
    await queryInterface.removeColumn('cases', 'external_status');
    await queryInterface.removeColumn('cases', 'last_synced_at');
    await queryInterface.removeColumn('cases', 'auto_sync_enabled');
    await queryInterface.removeColumn('cases', 'cnr_number');
  }
};
