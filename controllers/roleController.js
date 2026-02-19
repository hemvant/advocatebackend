const { Role } = require('../models');

const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({ order: [['id', 'ASC']] });
    res.json({ success: true, roles });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRoles };
