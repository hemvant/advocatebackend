'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const orgDesc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (!orgDesc.type) {
      await queryInterface.addColumn('organizations', 'type', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'FIRM'
      });
    }
    if (!orgDesc.is_trial) {
      await queryInterface.addColumn('organizations', 'is_trial', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!orgDesc.trial_ends_at) {
      await queryInterface.addColumn('organizations', 'trial_ends_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    const ouDesc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (!ouDesc.mobile) {
      await queryInterface.addColumn('organization_users', 'mobile', {
        type: Sequelize.STRING(50),
        allowNull: true
      });
    }
    if (!ouDesc.is_email_verified) {
      await queryInterface.addColumn('organization_users', 'is_email_verified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!ouDesc.email_verification_token) {
      await queryInterface.addColumn('organization_users', 'email_verification_token', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }
    if (!ouDesc.email_verification_expires) {
      await queryInterface.addColumn('organization_users', 'email_verification_expires', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const orgDesc = await queryInterface.describeTable('organizations').catch(() => ({}));
    if (orgDesc.type) await queryInterface.removeColumn('organizations', 'type');
    if (orgDesc.is_trial) await queryInterface.removeColumn('organizations', 'is_trial');
    if (orgDesc.trial_ends_at) await queryInterface.removeColumn('organizations', 'trial_ends_at');

    const ouDesc = await queryInterface.describeTable('organization_users').catch(() => ({}));
    if (ouDesc.mobile) await queryInterface.removeColumn('organization_users', 'mobile');
    if (ouDesc.is_email_verified) await queryInterface.removeColumn('organization_users', 'is_email_verified');
    if (ouDesc.email_verification_token) await queryInterface.removeColumn('organization_users', 'email_verification_token');
    if (ouDesc.email_verification_expires) await queryInterface.removeColumn('organization_users', 'email_verification_expires');
  }
};
