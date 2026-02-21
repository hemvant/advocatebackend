'use strict';

const crypto = require('crypto');
const { AuditLog } = require('../models');
const { generateChangeSummary, buildActionSummary } = require('./auditDiff');

const MODULES = Object.freeze(['DOCUMENTS', 'HEARINGS', 'CASES', 'CLIENTS', 'COURTS', 'AUTH', 'EMPLOYEES', 'REPORTS']);
const ACTION_TYPES = Object.freeze(['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'VIEW', 'DOWNLOAD', 'ASSIGN', 'MODULE_CHANGE']);

function getIp(req) {
  if (!req) return null;
  const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    return (first && first.trim()) || req.ip || null;
  }
  return req.ip || null;
}

function getUserAgent(req) {
  if (!req || !req.headers) return null;
  const ua = req.headers['user-agent'];
  return ua && String(ua).slice(0, 500) || null;
}

/**
 * Centralized audit logger. Does not throw; logs errors to console.
 * @param {object} params
 * @param {number} params.organization_id
 * @param {object} params.user - { id, name, role } (snapshot)
 * @param {string} params.module_name - e.g. DOCUMENTS, HEARINGS, CASES
 * @param {string} params.entity_type - DOCUMENT, CASE, HEARING, CLIENT, etc.
 * @param {number|null} params.entity_id
 * @param {string} params.action_type - CREATE, UPDATE, DELETE, RESTORE, LOGIN, LOGOUT, VIEW, DOWNLOAD, ASSIGN
 * @param {object|null} params.oldData - for diff (optional)
 * @param {object|null} params.newData - for diff (optional)
 * @param {string} [params.action_summary] - override auto-generated summary
 * @param {string} [params.entity_label] - e.g. "FinalOrder.pdf" for readable summary
 * @param {object} [params.req] - Express request (for IP, user-agent)
 */
async function logAudit(params) {
  const {
    organization_id,
    user,
    module_name,
    entity_type,
    entity_id,
    action_type,
    oldData,
    newData,
    action_summary: actionSummaryOverride,
    entity_label,
    req
  } = params;

  if (!organization_id || !entity_type || !action_type) return;

  let action_summary = actionSummaryOverride;
  let old_values = oldData;
  let new_values = newData;

  if (!action_summary && (oldData || newData) && action_type === 'UPDATE') {
    const diff = generateChangeSummary(oldData || {}, newData || {}, { summaryFallback: 'Updated' });
    action_summary = diff.summary;
    old_values = Object.keys(diff.oldValues).length ? diff.oldValues : null;
    new_values = Object.keys(diff.newValues).length ? diff.newValues : null;
  }

  if (!action_summary) {
    const userLabel = user && user.name ? `${user.name}${user.role ? ` (${user.role})` : ''}` : '';
    action_summary = buildActionSummary(action_type, entity_type, entity_label, userLabel);
  }

  const user_name = user && user.name ? String(user.name).slice(0, 255) : null;
  const user_role = user && user.role ? String(user.role).slice(0, 50) : null;
  const ip_address = getIp(req);
  const user_agent = getUserAgent(req);

  try {
    const prevRow = await AuditLog.findOne({
      where: { organization_id },
      order: [['id', 'DESC']],
      attributes: ['log_hash'],
      raw: true
    }).catch(() => null);
    const prevHashVal = prevRow && prevRow.log_hash ? prevRow.log_hash : '';

    const ts = new Date().toISOString();
    const payload = {
      organization_id,
      user_id: user && user.id != null ? user.id : null,
      user_name,
      user_role,
      module_name: module_name ? String(module_name).slice(0, 100) : null,
      entity_type,
      entity_id: entity_id ?? null,
      action_type,
      action_summary: action_summary ? String(action_summary).slice(0, 65535) : null,
      old_value: old_values,
      new_value: new_values,
      ip_address: ip_address ? String(ip_address).slice(0, 45) : null,
      user_agent
    };

    const chainPayload = prevHashVal + JSON.stringify({
      organization_id: payload.organization_id,
      user_id: payload.user_id,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      action_type: payload.action_type,
      action_summary: payload.action_summary,
      ts
    });
    payload.log_hash = crypto.createHash('sha256').update(chainPayload).digest('hex');

    await AuditLog.create(payload);
  } catch (err) {
    console.error('[auditLogger] logAudit failed:', err.message);
  }
}

module.exports = {
  logAudit,
  getIp,
  getUserAgent,
  MODULES,
  ACTION_TYPES
};
