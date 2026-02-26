const crypto = require('crypto');
const { sequelize, Organization, OrganizationUser, OrganizationModule, Module, Subscription, OrganizationSetupProgress } = require('../models');
const auditLogger = require('../utils/auditLogger');
const { emailQueue } = require('../queues');
const { getDefaultSoloOrganisation } = require('./organisationService');

const TRIAL_DAYS = 7;
const DEFAULT_FIRM_MODULES = ['Client Management', 'Case Management', 'Document Management', 'Billing', 'Calendar'];

async function register(data, req) {
  const { account_type, organization_name, advocate_name, email, mobile, password, address } = data;
  const existing = await OrganizationUser.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const result = await sequelize.transaction(async (tx) => {
    const isSolo = account_type === 'SOLO';
    let org;

    if (isSolo) {
      org = await getDefaultSoloOrganisation(tx);
      if (!org) {
        const err = new Error('Default solo organisation not found. Please run seeders.');
        err.statusCode = 503;
        throw err;
      }
    } else {
      const orgName = (organization_name || '').trim();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
      const orgPayload = {
        name: orgName,
        type: 'firm',
        is_active: true,
        is_trial: true,
        trial_ends_at: trialEndsAt
      };
      if (address != null && String(address).trim()) orgPayload.address = String(address).trim();
      org = await Organization.create(orgPayload, { transaction: tx });

      const moduleIds = await getFirmModuleIds(tx);
      if (moduleIds.length > 0) {
        await OrganizationModule.bulkCreate(
          moduleIds.map((module_id) => ({ organization_id: org.id, module_id })),
          { transaction: tx }
        );
      }

      await Subscription.create({
        organization_id: org.id,
        plan: 'TRIAL',
        status: 'ACTIVE',
        started_at: new Date(),
        expires_at: trialEndsAt
      }, { transaction: tx });

      await OrganizationSetupProgress.create({
        organization_id: org.id
      }, { transaction: tx });
    }

    const userPayload = {
      organization_id: org.id,
      name: (advocate_name || '').trim(),
      email: email.toLowerCase().trim(),
      mobile: (mobile || '').trim() || null,
      password,
      role: 'ORG_ADMIN',
      is_active: true,
      is_approved: true
    };
    const orgUser = await OrganizationUser.create(userPayload, { transaction: tx });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);
    await orgUser.update({
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires
    }, { transaction: tx });

    await auditLogger.logAudit({
      organization_id: org.id,
      user: { id: orgUser.id, name: orgUser.name, role: orgUser.role },
      module_name: 'AUTH',
      entity_type: isSolo ? 'EMPLOYEE' : 'ORGANIZATION',
      entity_id: isSolo ? orgUser.id : org.id,
      action_type: 'CREATE',
      newData: { account_type, email: orgUser.email, name: orgUser.name },
      req
    });

    return { org, orgUser, verificationToken };
  });

  if (emailQueue) {
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:8081';
    const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${result.verificationToken}`;
    emailQueue.add('send', {
      to: result.orgUser.email,
      subject: 'Verify your email - AdvocateLearn',
      template: 'verify-email',
      data: { verifyUrl, name: result.orgUser.name }
    }).catch(() => {});
  }

  return { organization: result.org, user: result.orgUser };
}

async function getFirmModuleIds(tx) {
  const modules = await Module.findAll({ where: { is_active: true }, attributes: ['id', 'name'], transaction: tx });
  const nameToId = Object.fromEntries(modules.map((m) => [m.name, m.id]));
  return DEFAULT_FIRM_MODULES.map((name) => nameToId[name]).filter(Boolean);
}

module.exports = { register };
