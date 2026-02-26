const { Organization, OrganizationUser } = require('../models');
const { writeProfileImageToDisk } = require('../config/uploads');
const auditService = require('../utils/auditService');

const updateOrganizationProfile = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const org = await Organization.findOne({ where: { id: organizationId } });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    const { name, email, phone, address } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = (name || '').trim() || org.name;
    if (email !== undefined) updates.email = (email || '').trim() || null;
    if (phone !== undefined) updates.phone = (phone || '').trim() || null;
    if (address !== undefined) updates.address = (address || '').trim() || null;
    const oldSnapshot = org.toJSON();
    await org.update(updates);
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'ORGANIZATION',
      entity_id: org.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: org.toJSON()
    });
    res.json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
};

const uploadOrganizationLogo = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const organizationId = req.user.organization_id;
    const org = await Organization.findOne({ where: { id: organizationId } });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    const relativePath = writeProfileImageToDisk(req.file, organizationId, 'logo');
    const oldLogo = org.logo_url;
    await org.update({ logo_url: relativePath });
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'ORGANIZATION',
      entity_id: org.id,
      action_type: 'UPDATE',
      old_value: { logo_url: oldLogo },
      new_value: { logo_url: relativePath }
    });
    res.json({ success: true, data: { logo_url: relativePath } });
  } catch (err) {
    next(err);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const user = await OrganizationUser.findOne({
      where: { id: req.user.id, organization_id: organizationId },
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { name, mobile } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = (name || '').trim() || user.name;
    if (mobile !== undefined) updates.mobile = (mobile || '').trim() || null;
    const oldSnapshot = user.toJSON();
    await user.update(updates);
    const updated = await OrganizationUser.findByPk(user.id, { attributes: { exclude: ['password'] } });
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated.toJSON()
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const uploadUserProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const organizationId = req.user.organization_id;
    const user = await OrganizationUser.findOne({
      where: { id: req.user.id, organization_id: organizationId }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const relativePath = writeProfileImageToDisk(req.file, organizationId, 'user');
    const oldPhoto = user.profile_photo_url;
    await user.update({ profile_photo_url: relativePath });
    await auditService.log(req, {
      organization_id: organizationId,
      user_id: req.user.id,
      entity_type: 'EMPLOYEE',
      entity_id: user.id,
      action_type: 'UPDATE',
      old_value: { profile_photo_url: oldPhoto },
      new_value: { profile_photo_url: relativePath }
    });
    const updated = await OrganizationUser.findByPk(user.id, { attributes: { exclude: ['password'] } });
    res.json({ success: true, data: { profile_photo_url: relativePath, user: updated }});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateOrganizationProfile,
  uploadOrganizationLogo,
  updateUserProfile,
  uploadUserProfilePhoto
};
