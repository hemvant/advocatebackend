const { OrganizationUser, Organization, Module, EmployeeModule } = require('../models');
const auditService = require('../utils/auditService');

const list = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const users = await OrganizationUser.findAll({
      where: { organization_id: organizationId },
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const user = await OrganizationUser.findOne({
      where: { id: req.params.id, organization_id: organizationId },
      include: [
        { model: Organization, as: 'Organization', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { name, email, password, role } = req.body;
    const existing = await OrganizationUser.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const user = await OrganizationUser.create({
      organization_id: organizationId,
      name,
      email,
      password,
      role: role || 'EMPLOYEE',
      is_active: true,
      is_approved: false
    });
    const userResponse = user.toJSON();
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
    res.status(201).json({ success: true, data: userResponse });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const user = await OrganizationUser.findOne({
      where: { id: req.params.id, organization_id: organizationId }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { name, is_active, is_approved, role } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_approved !== undefined) updates.is_approved = is_approved;
    if (role !== undefined) updates.role = role;
    const oldSnapshot = user.toJSON();
    delete oldSnapshot.password;
    await user.update(updates);
    const updated = await OrganizationUser.findByPk(user.id, { attributes: { exclude: ['password'] } });
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, ...updates }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const getEmployeeModules = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const user = await OrganizationUser.findOne({
      where: { id: req.params.id, organization_id: organizationId },
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name', 'description'] }],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user.Modules || [] });
  } catch (err) {
    next(err);
  }
};

const assignEmployeeModules = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { module_ids } = req.body;
    const user = await OrganizationUser.findOne({
      where: { id: req.params.id, organization_id: organizationId }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const oldLinks = await EmployeeModule.findAll({ where: { organization_user_id: user.id }, attributes: ['module_id'] });
    const oldModuleIds = (oldLinks || []).map((l) => l.module_id);
    await EmployeeModule.destroy({ where: { organization_user_id: user.id } });
    const records = (module_ids || []).map((module_id) => ({ organization_user_id: user.id, module_id }));
    await EmployeeModule.bulkCreate(records);
    const updated = await OrganizationUser.findByPk(user.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] }
    });
    const newModuleIds = (updated.Modules || []).map((m) => m.id);
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'MODULE_CHANGE',
      old_value: { module_ids: oldModuleIds },
      new_value: { module_ids: newModuleIds }
    });
    res.json({ success: true, data: updated.Modules || [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, getEmployeeModules, assignEmployeeModules };
