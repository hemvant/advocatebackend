'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const orgDesc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (!orgDesc.logo_url) {
      await queryInterface.addColumn('organizations', 'logo_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
    }

    const ouDesc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (!ouDesc.profile_photo_url) {
      await queryInterface.addColumn('organization_users', 'profile_photo_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const orgDesc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (orgDesc.logo_url) await queryInterface.removeColumn('organizations', 'logo_url');

    const ouDesc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (ouDesc.profile_photo_url) await queryInterface.removeColumn('organization_users', 'profile_photo_url');
  }
};
