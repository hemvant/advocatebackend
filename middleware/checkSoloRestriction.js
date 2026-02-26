const { Organization } = require('../models');

const checkSoloRestriction = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Organization context required' });
    }
    const org = await Organization.findByPk(organizationId, { attributes: ['id', 'type'] });
    if (!org) {
      return res.status(403).json({ success: false, message: 'Organization not found' });
    }
    const isSolo = org.type && (String(org.type).toLowerCase() === 'solo');
    if (isSolo) {
      return res.status(403).json({
        success: false,
        message: 'Solo accounts cannot add employees or assign staff modules.'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkSoloRestriction;
