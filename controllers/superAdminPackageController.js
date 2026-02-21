const { Package, PackageModule, Module } = require('../models');

async function listPackages(req, res, next) {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }
    const packages = await Package.findAll({
      where,
      order: [['name', 'ASC']],
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: packages });
  } catch (err) {
    next(err);
  }
}

async function getPackage(req, res, next) {
  try {
    const pkg = await Package.findByPk(req.params.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name', 'description'] }]
    });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: pkg });
  } catch (err) {
    next(err);
  }
}

async function createPackage(req, res, next) {
  try {
    const { name, description, price_monthly, price_annual, annual_discount_percent, employee_limit, duration_days, is_demo, module_ids } = req.body;
    const existing = await Package.findOne({ where: { name } });
    if (existing) return res.status(409).json({ success: false, message: 'Package name already exists' });
    const pkg = await Package.create({
      name,
      description: description || null,
      price_monthly: Number(price_monthly ?? 0),
      price_annual: Number(price_annual ?? 0),
      annual_discount_percent: annual_discount_percent != null ? Number(annual_discount_percent) : 0,
      employee_limit: Math.max(1, parseInt(employee_limit, 10) || 1),
      duration_days: is_demo ? 7 : (parseInt(duration_days, 10) || 30),
      is_demo: !!is_demo,
      is_active: true
    });
    if (Array.isArray(module_ids) && module_ids.length > 0) {
      await PackageModule.bulkCreate(module_ids.map((module_id) => ({ package_id: pkg.id, module_id })));
    }
    const created = await Package.findByPk(pkg.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }]
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

async function updatePackage(req, res, next) {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    const { name, description, price_monthly, price_annual, annual_discount_percent, employee_limit, duration_days, is_active, module_ids } = req.body;
    if (name !== undefined) pkg.name = name;
    if (description !== undefined) pkg.description = description;
    if (price_monthly !== undefined) pkg.price_monthly = Number(price_monthly);
    if (price_annual !== undefined) pkg.price_annual = Number(price_annual);
    if (annual_discount_percent !== undefined) pkg.annual_discount_percent = Number(annual_discount_percent);
    if (employee_limit !== undefined) pkg.employee_limit = Math.max(1, parseInt(employee_limit, 10) || 1);
    if (duration_days !== undefined && !pkg.is_demo) pkg.duration_days = Math.max(1, parseInt(duration_days, 10) || 30);
    if (is_active !== undefined) pkg.is_active = !!is_active;
    await pkg.save();
    if (module_ids !== undefined && Array.isArray(module_ids)) {
      await PackageModule.destroy({ where: { package_id: pkg.id } });
      if (module_ids.length > 0) {
        await PackageModule.bulkCreate(module_ids.map((module_id) => ({ package_id: pkg.id, module_id })));
      }
    }
    const updated = await Package.findByPk(pkg.id, {
      include: [{ model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function deletePackage(req, res, next) {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    await pkg.destroy();
    res.json({ success: true, message: 'Package deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPackages, getPackage, createPackage, updatePackage, deletePackage };
