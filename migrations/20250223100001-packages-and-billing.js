'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('packages', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price_monthly: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      price_annual: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      annual_discount_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
      employee_limit: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable('package_modules', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      package_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'packages', key: 'id' }, onDelete: 'CASCADE' },
      module_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'modules', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('package_modules', ['package_id']);
    await queryInterface.addIndex('package_modules', ['module_id']);

    const subDesc = await queryInterface.describeTable('subscriptions').catch(() => ({}));
    if (!subDesc.package_id) {
      await queryInterface.addColumn('subscriptions', 'package_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'packages', key: 'id' }, onDelete: 'SET NULL' });
    }
    if (!subDesc.billing_cycle) {
      await queryInterface.addColumn('subscriptions', 'billing_cycle', { type: Sequelize.STRING(20), allowNull: true });
    }

    const invDesc = await queryInterface.describeTable('invoices').catch(() => ({}));
    if (!invDesc.subscription_id) {
      await queryInterface.addColumn('invoices', 'subscription_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'subscriptions', key: 'id' }, onDelete: 'SET NULL' });
    }
    if (!invDesc.package_id) {
      await queryInterface.addColumn('invoices', 'package_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'packages', key: 'id' }, onDelete: 'SET NULL' });
    }
    if (!invDesc.billing_cycle) {
      await queryInterface.addColumn('invoices', 'billing_cycle', { type: Sequelize.STRING(20), allowNull: true });
    }
    if (!invDesc.period_start) {
      await queryInterface.addColumn('invoices', 'period_start', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!invDesc.period_end) {
      await queryInterface.addColumn('invoices', 'period_end', { type: Sequelize.DATEONLY, allowNull: true });
    }
    if (!invDesc.due_date) {
      await queryInterface.addColumn('invoices', 'due_date', { type: Sequelize.DATEONLY, allowNull: true });
    }
  },

  async down(queryInterface) {
    const invDesc = await queryInterface.describeTable('invoices').catch(() => ({}));
    if (invDesc.due_date) await queryInterface.removeColumn('invoices', 'due_date');
    if (invDesc.period_end) await queryInterface.removeColumn('invoices', 'period_end');
    if (invDesc.period_start) await queryInterface.removeColumn('invoices', 'period_start');
    if (invDesc.billing_cycle) await queryInterface.removeColumn('invoices', 'billing_cycle');
    if (invDesc.package_id) await queryInterface.removeColumn('invoices', 'package_id');
    if (invDesc.subscription_id) await queryInterface.removeColumn('invoices', 'subscription_id');

    const subDesc = await queryInterface.describeTable('subscriptions').catch(() => ({}));
    if (subDesc.billing_cycle) await queryInterface.removeColumn('subscriptions', 'billing_cycle');
    if (subDesc.package_id) await queryInterface.removeColumn('subscriptions', 'package_id');

    await queryInterface.dropTable('package_modules').catch(() => {});
    await queryInterface.dropTable('packages').catch(() => {});
  }
};
