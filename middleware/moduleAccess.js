const { OrganizationModule, EmployeeModule, Module } = require('../models');

const moduleAccessMiddleware = (moduleName) => {
  return async (req, res, next) => {
    if (req.superAdmin) {
      return next();
    }
    if (!req.user) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
      const moduleRecord = await Module.findOne({ where: { name: moduleName, is_active: true } });
      if (!moduleRecord) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }
      const orgHasModule = await OrganizationModule.findOne({
        where: { organization_id: req.user.organization_id, module_id: moduleRecord.id }
      });
      if (!orgHasModule) {
        return res.status(403).json({ success: false, message: 'Organization does not have access to this module' });
      }
      if (req.user.role === 'ORG_ADMIN') {
        return next();
      }
      const employeeHasModule = await EmployeeModule.findOne({
        where: { organization_user_id: req.user.id, module_id: moduleRecord.id }
      });
      if (!employeeHasModule) {
        return res.status(403).json({ success: false, message: 'You do not have access to this module' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { moduleAccessMiddleware };
