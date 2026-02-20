const jwt = require('jsonwebtoken');
const config = require('../config');
const { SuperAdmin, SuperAdminLoginAttempt, SystemMetric } = require('../models');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function getClientIp(req) {
  return req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip']).split(',')[0].trim() : (req.connection && req.connection.remoteAddress) || null;
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);
    const admin = await SuperAdmin.findOne({ where: { email } });
    if (admin && admin.locked_until && new Date() < new Date(admin.locked_until)) {
      await SuperAdminLoginAttempt.create({ email, ip_address: ip, success: false });
      return res.status(423).json({ success: false, message: 'Account temporarily locked. Try again after ' + LOCK_MINUTES + ' minutes.' });
    }
    if (!admin) {
      await SuperAdminLoginAttempt.create({ email: email || '', ip_address: ip, success: false });
      SystemMetric.create({ metric_name: 'super_admin_failed_login', metric_value: 1 }).catch(() => {});
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    const match = await admin.comparePassword(password);
    if (!match) {
      await SuperAdminLoginAttempt.create({ email, ip_address: ip, success: false });
      SystemMetric.create({ metric_name: 'super_admin_failed_login', metric_value: 1 }).catch(() => {});
      const failCount = (admin.failed_login_count || 0) + 1;
      const updates = { failed_login_count: failCount };
      if (failCount >= MAX_FAILED_ATTEMPTS) updates.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      await admin.update(updates);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    console.log('Model:', SuperAdminLoginAttempt);
console.log('Create fn:', typeof SuperAdminLoginAttempt?.create);
    await SuperAdminLoginAttempt.create({ email, ip_address: ip, success: true });
    await admin.update({ failed_login_count: 0, locked_until: null, last_login_ip: ip });
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
