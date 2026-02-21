const { Package, PackageModule, OrganizationModule } = require('../models');

/**
 * Sync organization_modules from package's modules. Replaces org's current module assignment.
 * @param {number} organizationId
 * @param {number} packageId
 * @returns {Promise<number[]>} module_ids that were assigned
 */
async function syncOrgModulesFromPackage(organizationId, packageId) {
  const rows = await PackageModule.findAll({
    where: { package_id: packageId },
    attributes: ['module_id']
  });
  const moduleIds = [...new Set(rows.map((r) => r.module_id))];
  await OrganizationModule.destroy({ where: { organization_id: organizationId } });
  if (moduleIds.length > 0) {
    await OrganizationModule.bulkCreate(
      moduleIds.map((module_id) => ({ organization_id: organizationId, module_id }))
    );
  }
  return moduleIds;
}

/**
 * Get active subscription for org (status ACTIVE and expires_at in future or null).
 */
async function getActiveSubscription(organizationId) {
  const { Subscription, Package } = require('../models');
  const { Op } = require('sequelize');
  const now = new Date();
  return Subscription.findOne({
    where: {
      organization_id: organizationId,
      status: 'ACTIVE',
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gte]: now } }]
    },
    include: [{ model: Package, as: 'Package', attributes: ['id', 'name', 'employee_limit', 'price_monthly', 'price_annual'] }]
  });
}

module.exports = { syncOrgModulesFromPackage, getActiveSubscription };
