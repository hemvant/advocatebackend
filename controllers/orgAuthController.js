const jwt = require('jsonwebtoken');
const config = require('../config');
const { OrganizationUser, Organization, Module } = require('../models');
const auditService = require('../utils/auditService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await OrganizationUser.findOne({
      where: { email },
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name', 'is_active'] }]
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
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
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { type: 'org', id: user.id, organizationId: user.organization_id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.cookie(config.jwt.cookieName, token, config.cookieOptions);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      module_name: 'AUTH',
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'LOGIN',
      old_value: null,
      new_value: { email: user.email, logged_at: new Date().toISOString() }
    });
    const userResponse = user.toJSON();
    userResponse.organization = user.Organization;
    return res.json({ success: true, user: { ...userResponse, type: 'org' } });
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
    const user = await OrganizationUser.findByPk(req.user.id, {
      include: [
        { model: Organization, as: 'Organization', attributes: ['id', 'name', 'is_active'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userResponse = user.toJSON();
    userResponse.organization = user.Organization;
    res.json({ success: true, user: { ...userResponse, type: 'org' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, me };
