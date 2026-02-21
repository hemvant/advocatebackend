const { AuditLog, OrganizationUser } = require('../models');
const { Op } = require('sequelize');

function buildAuditWhere(user, query) {
  const where = { organization_id: user.organization_id };
  if (user.role !== 'ORG_ADMIN') {
    where.user_id = user.id;
  }
  const { entity_type, user_id, action_type, module_name, from_date, to_date } = query || {};
  if (entity_type && entity_type.trim()) where.entity_type = entity_type.trim();
  if (user_id) where.user_id = parseInt(user_id, 10);
  if (action_type && action_type.trim()) where.action_type = action_type.trim();
  if (module_name && module_name.trim()) where.module_name = module_name.trim();
  if (from_date || to_date) {
    where.created_at = {};
    if (from_date) where.created_at[Op.gte] = new Date(from_date);
    if (to_date) {
      const end = new Date(to_date);
      end.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = end;
    }
  }
  return where;
}

const listAuditLogs = async (req, res, next) => {
  try {
    const user = req.user;
    const { entity_type, user_id, action_type, module_name, from_date, to_date, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;

    const where = buildAuditWhere(user, { entity_type, user_id, action_type, module_name, from_date, to_date });

    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const orderCol = ['created_at', 'action_type', 'entity_type', 'module_name'].includes(sort) ? sort : 'created_at';
    const orderDir = (order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'], required: false }],
      limit: limitNum,
      offset,
      order: [[orderCol, orderDir]]
    });

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

const exportAuditLogs = async (req, res, next) => {
  try {
    const user = req.user;
    const { entity_type, user_id, action_type, module_name, from_date, to_date } = req.query;

    const where = buildAuditWhere(user, { entity_type, user_id, action_type, module_name, from_date, to_date });

    const maxExport = 10000;
    const rows = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: maxExport
    });

    const header = 'Created At,User Name,User Role,Module,Entity Type,Entity ID,Action Type,Action Summary,IP Address,User Agent\n';
    const escapeCsv = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = rows.map((r) => {
      const summary = (r.action_summary || '').replace(/\r?\n/g, ' ');
      return [
        r.created_at ? new Date(r.created_at).toISOString() : '',
        escapeCsv(r.user_name),
        escapeCsv(r.user_role),
        escapeCsv(r.module_name),
        escapeCsv(r.entity_type),
        r.entity_id ?? '',
        escapeCsv(r.action_type),
        escapeCsv(summary),
        escapeCsv(r.ip_address),
        escapeCsv(r.user_agent)
      ].join(',');
    });
    const csv = header + lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = { listAuditLogs, exportAuditLogs };
