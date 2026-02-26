'use strict';

const { Organization, OrganizationModule, Module } = require('../models');

const DEFAULT_SOLO_NAME = 'Solo Practice';
const DEFAULT_SOLO_TYPE = 'solo';

module.exports = {
  async up() {
    let org = await Organization.findOne({
      where: { is_system_default: true }
    });
    if (!org) {
      org = await Organization.findOne({
        where: { name: DEFAULT_SOLO_NAME }
      });
      if (org) {
        await org.update({ type: DEFAULT_SOLO_TYPE, is_system_default: true });
      }
    }
    if (!org) {
      org = await Organization.create({
        name: DEFAULT_SOLO_NAME,
        type: DEFAULT_SOLO_TYPE,
        is_system_default: true,
        is_active: true,
        is_trial: false
      });
    }

    const count = await OrganizationModule.count({ where: { organization_id: org.id } });
    if (count > 0) return;

    const modules = await Module.findAll({ where: { is_active: true }, attributes: ['id'] });
    if (modules.length > 0) {
      await OrganizationModule.bulkCreate(
        modules.map((m) => ({ organization_id: org.id, module_id: m.id }))
      );
    }
  },

  async down() {
    const org = await Organization.findOne({ where: { name: DEFAULT_SOLO_NAME } });
    if (org) {
      await OrganizationModule.destroy({ where: { organization_id: org.id } });
      await org.destroy();
    }
  }
};
