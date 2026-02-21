const { Organization, OrganizationUser, OrganizationModule, Module, Package, Subscription } = require('../models');
const { syncOrgModulesFromPackage } = require('../utils/subscriptionService');

const list = async (req, res, next) => {
  try {
    const organizations = await Organization.findAll({
      order: [['created_at', 'DESC']],
      attributes: { exclude: [] }
    });
    res.json({ success: true, data: organizations });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id, {
      include: [
        { model: OrganizationUser, as: 'OrganizationUsers', attributes: { exclude: ['password'] } },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ]
    });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, email, phone, address, subscription_plan, org_admin_name, org_admin_email, org_admin_password, package_id, billing_cycle } = req.body;
    const existingOrg = await Organization.findOne({ where: { name } });
    if (existingOrg) {
      return res.status(409).json({ success: false, message: 'Organization name already exists' });
    }
    const existingEmail = await OrganizationUser.findOne({ where: { email: org_admin_email } });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Org admin email already registered' });
    }
    const org = await Organization.create({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      subscription_plan: subscription_plan || null,
      is_active: true
    });
    const orgAdmin = await OrganizationUser.create({
      organization_id: org.id,
      name: org_admin_name,
      email: org_admin_email,
      password: org_admin_password,
      role: 'ORG_ADMIN',
      is_active: true,
      is_approved: true
    });
    if (package_id && billing_cycle && (billing_cycle === 'MONTHLY' || billing_cycle === 'ANNUAL')) {
      const pkg = await Package.findByPk(package_id);
      if (pkg) {
        const start = new Date();
        const expiresAt = billing_cycle === 'ANNUAL'
          ? new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
          : new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
        await Subscription.create({
          organization_id: org.id,
          package_id: pkg.id,
          plan: pkg.name,
          billing_cycle,
          status: 'ACTIVE',
          started_at: start,
          expires_at: expiresAt
        });
        await syncOrgModulesFromPackage(org.id, pkg.id);
      }
    }
    const orgResponse = org.toJSON();
    orgResponse.org_admin = orgAdmin.toJSON();
    res.status(201).json({ success: true, data: orgResponse, message: 'Organization and org admin created' });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    const { name, email, phone, address, subscription_plan, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan;
    if (is_active !== undefined) updates.is_active = is_active;
    await org.update(updates);
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
};

const getOrgModules = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name', 'description'] }]
    });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    res.json({ success: true, data: org.Modules || [] });
  } catch (err) {
    next(err);
  }
};

const assignModules = async (req, res, next) => {
  try {
    const { module_ids } = req.body;
    const org = await Organization.findByPk(req.params.id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    await OrganizationModule.destroy({ where: { organization_id: org.id } });
    const records = module_ids.map((module_id) => ({ organization_id: org.id, module_id }));
    await OrganizationModule.bulkCreate(records);
    const updated = await Organization.findByPk(org.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: updated.Modules || [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, getOrgModules, assignModules };
