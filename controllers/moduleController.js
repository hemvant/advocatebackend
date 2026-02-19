const { Module, OrganizationModule } = require('../models');
const { Op } = require('sequelize');

const list = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      const modules = await Module.findAll({
        where: { is_active: true },
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'description', 'is_active']
      });
      return res.json({ success: true, data: modules });
    }
    const links = await OrganizationModule.findAll({
      where: { organization_id: organizationId },
      attributes: ['module_id']
    });
    const ids = links.map((l) => l.module_id).filter(Boolean);
    if (ids.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const modules = await Module.findAll({
      where: { id: { [Op.in]: ids }, is_active: true },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'is_active']
    });
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const modules = await Module.findAll({
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'is_active']
    });
    res.json({ success: true, data: modules });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAll };
