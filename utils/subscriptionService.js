const { Package, PackageModule, OrganizationModule, Subscription, Module } = require('../models');
const { Op } = require('sequelize');

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
  const now = new Date();
  return Subscription.findOne({
    where: {
      organization_id: organizationId,
      status: 'ACTIVE',
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gte]: now } }]
    },
    include: [{ model: Package, as: 'Package', attributes: ['id', 'name', 'employee_limit', 'price_monthly', 'price_annual', 'duration_days', 'is_demo'] }]
  });
}

/**
 * Get latest subscription for org (regardless of status or expiry). For display and access checks.
 */
async function getSubscriptionForOrg(organizationId) {
  const sub = await Subscription.findOne({
    where: { organization_id: organizationId },
    order: [['id', 'DESC']],
    include: [{ model: Package, as: 'Package', attributes: ['id', 'name', 'duration_days', 'is_demo', 'price_monthly', 'price_annual', 'employee_limit'] }]
  });
  if (!sub || !sub.Package) return { subscription: sub, packageModules: [] };
  const rows = await PackageModule.findAll({
    where: { package_id: sub.Package.id },
    attributes: ['module_id']
  });
  const moduleIds = [...new Set(rows.map((r) => r.module_id))];
  let packageModules = [];
  if (moduleIds.length > 0) {
    packageModules = await Module.findAll({
      where: { id: { [Op.in]: moduleIds }, is_active: true },
      attributes: ['id', 'name']
    });
  }
  return { subscription: sub, packageModules };
}

function isSubscriptionExpired(subscription) {
  if (!subscription || subscription.status === 'EXPIRED') return true;
  if (!subscription.expires_at) return false;
  return new Date(subscription.expires_at) < new Date();
}

module.exports = { syncOrgModulesFromPackage, getActiveSubscription, getSubscriptionForOrg, isSubscriptionExpired };
