const { AuditLog, OrganizationUser } = require('../models');
const { Op } = require('sequelize');
const cache = require('../utils/cache');

const listAuditLogs = async (req, res, next) => {
  try {
    const user = req.user;
    const { entity_type, user_id, action_type, from_date, to_date, page = 1, limit = 20 } = req.query;

    const cacheKey = cache.cacheKey('reports:audit', [user.organization_id, user.id, user.role, entity_type, user_id, action_type, from_date, to_date, page, limit]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const where = { organization_id: user.organization_id };
    if (user.role !== 'ORG_ADMIN') {
      where.user_id = user.id;
    }
    if (entity_type && entity_type.trim()) where.entity_type = entity_type.trim();
    if (user_id) where.user_id = parseInt(user_id, 10);
    if (action_type && action_type.trim()) where.action_type = action_type.trim();
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }

    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'], required: false }],
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']]
    });

    const payload = {
      success: true,
      data: rows,
      pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) }
    };
    await cache.set(cacheKey, payload, cache.TTL.REPORTS);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

module.exports = { listAuditLogs };
