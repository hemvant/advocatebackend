'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const pkgDesc = await queryInterface.describeTable('packages').catch(() => ({}));
    if (!pkgDesc.duration_days) {
      await queryInterface.addColumn('packages', 'duration_days', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 30
      });
    }
    if (!pkgDesc.is_demo) {
      await queryInterface.addColumn('packages', 'is_demo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    const [packages] = await queryInterface.sequelize.query(
      "SELECT id FROM packages WHERE name = 'Demo' LIMIT 1"
    );
    if (packages.length === 0) {
      const [modules] = await queryInterface.sequelize.query(
        'SELECT id FROM modules WHERE is_active = 1'
      );
      const moduleIds = modules.map((m) => m.id);
      const now = new Date();
      await queryInterface.bulkInsert('packages', [{
        name: 'Demo',
        description: 'Demo package with all modules, 7 days',
        price_monthly: 0,
        price_annual: 0,
        annual_discount_percent: 0,
        employee_limit: 10,
        is_active: true,
        duration_days: 7,
        is_demo: true,
        created_at: now,
        updated_at: now
      }]);
      const [[{ id: demoId }]] = await queryInterface.sequelize.query(
        "SELECT id FROM packages WHERE name = 'Demo' LIMIT 1"
      );
      if (demoId && moduleIds.length > 0) {
        await queryInterface.bulkInsert('package_modules', moduleIds.map((module_id) => ({
          package_id: demoId,
          module_id,
          created_at: now,
          updated_at: now
        })));
      }
    }
  },

  async down(queryInterface) {
    const pkgDesc = await queryInterface.describeTable('packages').catch(() => ({}));
    if (pkgDesc.duration_days) await queryInterface.removeColumn('packages', 'duration_days');
    if (pkgDesc.is_demo) await queryInterface.removeColumn('packages', 'is_demo');
  }
};
