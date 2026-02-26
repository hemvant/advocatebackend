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

async function sendRegistrationResponse(user, res) {
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
}

async function register(req, res, next) {
  try {
    const { user } = await registrationService.register(req.body, req);
    await sendRegistrationResponse(user, res);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function registerOrganisation(req, res, next) {
  try {
    const body = {
      account_type: 'ORGANIZATION',
      organization_name: req.body.organisation_name,
      advocate_name: req.body.full_name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: req.body.password,
      address: req.body.office_address || null
    };
    const { user } = await registrationService.register(body, req);
    await sendRegistrationResponse(user, res);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function registerAdvocate(req, res, next) {
  try {
    const body = {
      account_type: 'SOLO',
      advocate_name: req.body.full_name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: req.body.password
    };
    const { user } = await registrationService.register(body, req);
    await sendRegistrationResponse(user, res);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, message: err.message });
    }
    next(err);
  }
}

module.exports = { register, verifyEmail, registerOrganisation, registerAdvocate };
