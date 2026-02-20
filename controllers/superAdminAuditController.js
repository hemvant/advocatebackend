const { AuditLog, OrganizationUser, Organization } = require('../models');
const { Op } = require('sequelize');

async function listPlatformAuditLogs(req, res, next) {
  try {
    const { organization_id, action_type, entity_type, from_date, to_date, page = 1, limit = 50 } = req.query;
    const where = {};
    if (organization_id) where.organization_id = parseInt(organization_id, 10);
    if (action_type && action_type.trim()) where.action_type = action_type.trim();
    if (entity_type && entity_type.trim()) where.entity_type = entity_type.trim();
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'], required: false },
        { model: Organization, as: 'Organization', attributes: ['id', 'name'], required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset
    });
    res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlatformAuditLogs };
