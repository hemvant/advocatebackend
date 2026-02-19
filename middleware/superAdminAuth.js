const jwt = require('jsonwebtoken');
const config = require('../config');
const { SuperAdmin } = require('../models');

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[config.jwt.cookieName];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' });
    }
    const admin = await SuperAdmin.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Super admin not found' });
    }
    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    req.superAdmin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = superAdminAuth;
