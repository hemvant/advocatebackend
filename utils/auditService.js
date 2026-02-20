const { AuditLog } = require('../models');

const ENTITY_TYPES = Object.freeze(['CLIENT', 'CASE', 'HEARING', 'DOCUMENT', 'COURT', 'EMPLOYEE']);
const ACTION_TYPES = Object.freeze(['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'LOGIN', 'MODULE_CHANGE']);

function getIp(req) {
  if (!req) return null;
  const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return (first && first.trim()) || req.ip || null;
  }
  return req.ip || null;
}

/**
 * Create an audit log entry. Does not throw; failures are logged to console only.
 * @param {object} req - Express request (for ip_address). Can be null for background jobs.
 * @param {object} params
 * @param {number} params.organization_id
 * @param {number|null} params.user_id
 * @param {string} params.entity_type - CLIENT | CASE | HEARING | DOCUMENT | COURT | EMPLOYEE
 * @param {number|null} params.entity_id
 * @param {string} params.action_type - CREATE | UPDATE | DELETE | ASSIGN | LOGIN | MODULE_CHANGE
 * @param {object|null} params.old_value - JSON-serializable
 * @param {object|null} params.new_value - JSON-serializable
 */
async function log(req, params) {
  const { organization_id, user_id, entity_type, entity_id, action_type, old_value, new_value } = params;
  if (!organization_id || !entity_type || !action_type) return;
  try {
    await AuditLog.create({
      organization_id,
      user_id: user_id ?? null,
      entity_type,
      entity_id: entity_id ?? null,
      action_type,
      old_value: old_value ?? null,
      new_value: new_value ?? null,
      ip_address: getIp(req)
    });
  } catch (err) {
    console.error('[auditService] log failed:', err.message);
  }
}

module.exports = {
  log,
  getIp,
  ENTITY_TYPES,
  ACTION_TYPES
};
