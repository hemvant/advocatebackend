const { UserModule, Module } = require('../models');

const requireModule = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.Role?.name === 'SUPER_ADMIN') {
      return next();
    }
    try {
      const assignment = await UserModule.findOne({
        where: { user_id: req.user.id },
        include: [{ model: Module, as: 'Module', where: { name: moduleName, is_active: true } }]
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'Module access denied' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { requireModule };
