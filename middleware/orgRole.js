const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

const requireOrgAdmin = roleMiddleware('ORG_ADMIN');
const requireOrgAdminOrEmployee = roleMiddleware('ORG_ADMIN', 'EMPLOYEE');

module.exports = { roleMiddleware, requireOrgAdmin, requireOrgAdminOrEmployee };
