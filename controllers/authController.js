const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Role, Module } = require('../models');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userCount = await User.count();
    const roleSuperAdmin = await Role.findOne({ where: { name: 'SUPER_ADMIN' } });
    const roleUser = await Role.findOne({ where: { name: 'USER' } });
    if (!roleSuperAdmin || !roleUser) {
      return res.status(500).json({ success: false, message: 'Roles not seeded' });
    }
    const isFirstUser = userCount === 0;
    const role_id = isFirstUser ? roleSuperAdmin.id : roleUser.id;
    const is_approved = isFirstUser;
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role_id, is_approved });
    const userWithRole = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'Role', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password'] }
    });
    const token = jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.cookie(config.jwt.cookieName, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.status(201).json({
      success: true,
      message: isFirstUser ? 'Super admin registered' : 'Registration successful. Awaiting approval.',
      user: userWithRole
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'Role', attributes: ['id', 'name'] }]
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.is_approved) {
      return res.status(403).json({ success: false, message: 'Account pending approval' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.cookie(config.jwt.cookieName, token, {
      httpOnly: true,
      secure: false,
      sameSite:'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    const userResponse = user.toJSON();
    return res.json({ success: true, user: userResponse });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie(config.jwt.cookieName, {
    httpOnly: true,
    secure: false,
    sameSite:'lax'
  });
  res.json({ success: true, message: 'Logged out' });
};

const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'Role', attributes: ['id', 'name'] },
        { model: Module, as: 'Modules', through: { attributes: [] }, attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me };