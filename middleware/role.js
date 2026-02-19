const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.Role) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const roleName = req.user.Role.name;
    if (!allowedRoles.includes(roleName)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

const requireSuperAdmin = requireRole('SUPER_ADMIN');
const requireAdmin = requireRole('SUPER_ADMIN', 'ADMIN');

module.exports = { requireRole, requireSuperAdmin, requireAdmin };
