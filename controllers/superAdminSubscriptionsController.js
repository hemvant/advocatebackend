const { sequelize, Subscription, Organization, Package, Module } = require('../models');
const { Op } = require('sequelize');
const { syncOrgModulesFromPackage } = require('../utils/subscriptionService');

const includeOrgAndPackage = [
  { model: Organization, as: 'Organization', attributes: ['id', 'name'] },
  { model: Package, as: 'Package', attributes: ['id', 'name', 'employee_limit', 'price_monthly', 'price_annual'], required: false }
];

async function listSubscriptions(req, res, next) {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const active = await Subscription.findAll({
      where: { status: 'ACTIVE', expires_at: { [Op.or]: [{ [Op.gte]: now }, { [Op.eq]: null }] } },
      include: includeOrgAndPackage,
      order: [['expires_at', 'ASC']]
    });
    const expiringSoon = await Subscription.findAll({
      where: { status: 'ACTIVE', expires_at: { [Op.and]: [{ [Op.gte]: now }, { [Op.lte]: in7Days }] } },
      include: includeOrgAndPackage
    });
    const expired = await Subscription.findAll({
      where: { status: 'EXPIRED' },
      include: includeOrgAndPackage,
      limit: 50
    });

    const planDistribution = await Subscription.findAll({
      where: { status: 'ACTIVE' },
      attributes: ['plan', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['plan'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        active,
        expiring_soon: expiringSoon,
        expired,
        plan_distribution: planDistribution.map((r) => ({ plan: r.plan, count: Number(r.count) }))
      }
    });
  } catch (err) {
    next(err);
  }
}

async function assignSubscription(req, res, next) {
  try {
    const { organizationId } = req.params;
    const { package_id, started_at } = req.body;
    const org = await Organization.findByPk(organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    const pkg = await Package.findByPk(package_id, { include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id'] }] });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    const start = started_at ? new Date(started_at) : new Date();
    const durationDays = pkg.is_demo ? 7 : (pkg.duration_days || 30);
    const expiresAt = new Date(start);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    let sub = await Subscription.findOne({ where: { organization_id: organizationId }, order: [['id', 'DESC']] });
    if (sub) {
      sub.package_id = pkg.id;
      sub.plan = pkg.name;
      sub.billing_cycle = null;
      sub.started_at = start;
      sub.expires_at = expiresAt;
      sub.status = 'ACTIVE';
      await sub.save();
    } else {
      sub = await Subscription.create({
        organization_id: organizationId,
        package_id: pkg.id,
        plan: pkg.name,
        billing_cycle: null,
        status: 'ACTIVE',
        started_at: start,
        expires_at: expiresAt
      });
    }
    await syncOrgModulesFromPackage(Number(organizationId), pkg.id);
    const updated = await Subscription.findByPk(sub.id, { include: includeOrgAndPackage });
    res.json({ success: true, data: updated, message: 'Subscription assigned; organization modules updated from package' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSubscriptions, assignSubscription };
