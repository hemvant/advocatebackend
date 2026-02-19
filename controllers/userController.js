const { User, Role, Module, UserModule } = require('../models');
const { Op } = require('sequelize');

const listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [
        { model: Role, as: 'Role', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'Role', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.is_approved = is_approved;
    await user.save();
    const updated = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'Role', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_active, role_id } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (name !== undefined) user.name = name;
    if (is_active !== undefined) user.is_active = is_active;
    if (role_id !== undefined) {
      const role = await Role.findByPk(role_id);
      if (!role) return res.status(400).json({ success: false, message: 'Invalid role_id' });
      user.role_id = role_id;
    }
    await user.save();
    const updated = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'Role', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

const assignModules = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { module_ids } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const modules = await Module.findAll({ where: { id: { [Op.in]: module_ids }, is_active: true } });
    if (modules.length !== module_ids.length) {
      return res.status(400).json({ success: false, message: 'One or more invalid or inactive module IDs' });
    }
    await UserModule.destroy({ where: { user_id: id } });
    await UserModule.bulkCreate(module_ids.map(module_id => ({ user_id: id, module_id })));
    const updated = await User.findByPk(id, {
      include: [
        { model: Role, as: 'Role', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, approveUser, updateUser, assignModules };
