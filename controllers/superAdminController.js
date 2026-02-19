const jwt = require('jsonwebtoken');
const config = require('../config');
const { SuperAdmin } = require('../models');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    const match = await admin.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { type: 'super_admin', id: admin.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.cookie(config.jwt.cookieName, token, config.cookieOptions);
    const adminResponse = admin.toJSON();
    return res.json({ success: true, user: { ...adminResponse, type: 'super_admin' } });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie(config.jwt.cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
  res.json({ success: true, message: 'Logged out' });
};

const me = async (req, res, next) => {
  try {
    const admin = await SuperAdmin.findByPk(req.superAdmin.id, { attributes: { exclude: ['password'] } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }
    res.json({ success: true, user: { ...admin.toJSON(), type: 'super_admin' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, me };
