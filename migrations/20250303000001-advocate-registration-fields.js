'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (!desc.bar_council_number) {
      await queryInterface.addColumn('organization_users', 'bar_council_number', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }
    if (!desc.years_of_practice) {
      await queryInterface.addColumn('organization_users', 'years_of_practice', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (desc.bar_council_number) await queryInterface.removeColumn('organization_users', 'bar_council_number');
    if (desc.years_of_practice) await queryInterface.removeColumn('organization_users', 'years_of_practice');
  }
};
