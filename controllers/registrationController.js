const jwt = require('jsonwebtoken');
const config = require('../config');
const { OrganizationUser, Organization } = require('../models');
const registrationService = require('../services/registrationService');

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    const user = await OrganizationUser.findOne({
      where: { email_verification_token: token }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    }
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification link has expired' });
    }
    await user.update({
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires: null
    });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { organization, user } = await registrationService.register(req.body, req);
    const orgUser = await OrganizationUser.findByPk(user.id, {
      include: [{ model: Organization, as: 'Organization', attributes: ['id', 'name', 'is_active', 'type', 'is_trial', 'trial_ends_at'] }],
      attributes: { exclude: ['password', 'email_verification_token'] }
    });
    const token = jwt.sign(
      { type: 'org', id: orgUser.id, organizationId: orgUser.organization_id, role: orgUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.cookie(config.jwt.cookieName, token, config.cookieOptions);
    const userResponse = orgUser.toJSON();
    userResponse.organization = orgUser.Organization;
    res.status(201).json({ success: true, user: { ...userResponse, type: 'org' }, token });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
}

module.exports = { register, verifyEmail };
