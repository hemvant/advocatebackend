const jwt = require('jsonwebtoken');
const config = require('../config');
const { OrganizationUser, Organization } = require('../models');

const organizationAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[config.jwt.cookieName];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'org') {
      return res.status(403).json({ success: false, message: 'Organization access required' });
    }
    const user = await OrganizationUser.findByPk(decoded.id, {
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name', 'is_active'] }],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.Organization?.is_active) {
      return res.status(403).json({ success: false, message: 'Organization is deactivated' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (!user.is_approved) {
      return res.status(403).json({ success: false, message: 'Account pending approval' });
    }
    req.user = user;
    req.organization = user.Organization;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = organizationAuth;
