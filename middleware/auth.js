const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Role } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.[config.jwt.cookieName];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'Role', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = auth;
