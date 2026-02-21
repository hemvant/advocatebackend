const auditLogger = require('./auditLogger');

const ENTITY_TYPES = Object.freeze(['CLIENT', 'CASE', 'HEARING', 'DOCUMENT', 'COURT', 'EMPLOYEE']);
const ACTION_TYPES = Object.freeze(['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'LOGIN', 'MODULE_CHANGE']);

const ENTITY_TO_MODULE = { CLIENT: 'CLIENTS', CASE: 'CASES', HEARING: 'HEARINGS', DOCUMENT: 'DOCUMENTS', COURT: 'COURTS', EMPLOYEE: 'EMPLOYEES' };

function getIp(req) {
  return auditLogger.getIp(req);
}

/**
 * Create an audit log entry via centralized logger. Does not throw.
 * @param {object} req - Express request (user, ip, user-agent). Can be null.
 * @param {object} params - organization_id, user_id?, entity_type, entity_id?, action_type, old_value?, new_value?, action_summary?, entity_label?, module_name?
 */
async function log(req, params) {
  const { organization_id, user_id, entity_type, entity_id, action_type, old_value, new_value, action_summary, entity_label, module_name } = params;
  if (!organization_id || !entity_type || !action_type) return;
  const user = req && req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : (user_id != null ? { id: user_id } : null);
  await auditLogger.logAudit({
    organization_id,
    user,
    module_name: module_name || ENTITY_TO_MODULE[entity_type] || null,
    entity_type,
    entity_id: entity_id ?? null,
    action_type,
    oldData: old_value ?? null,
    newData: new_value ?? null,
    action_summary_override: action_summary,
    entity_label,
    req
  });
}

module.exports = {
  log,
  getIp,
  ENTITY_TYPES,
  ACTION_TYPES
};
