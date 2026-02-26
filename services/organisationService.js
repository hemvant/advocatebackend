const { Organization } = require('../models');

const DEFAULT_SOLO_NAME = 'Solo Practice';

async function getDefaultSoloOrganisation(transaction) {
  const opts = transaction ? { transaction } : {};
  let org = await Organization.findOne({
    where: { is_system_default: true },
    ...opts
  });
  if (!org) {
    org = await Organization.findOne({
      where: {
        name: DEFAULT_SOLO_NAME,
        type: ['solo', 'SOLO']
      },
      ...opts
    });
  }
  return org;
}

module.exports = { getDefaultSoloOrganisation };
