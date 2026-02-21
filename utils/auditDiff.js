'use strict';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'api_key', 'apiKey'];

function isSensitive(key) {
  const k = String(key).toLowerCase();
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}

function safeValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && !Array.isArray(v)) return '[Object]';
  if (typeof v === 'function') return '[Function]';
  return v;
}

function humanFieldName(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function generateChangeSummary(oldData, newData, options = {}) {
  const oldValues = {};
  const newValues = {};
  const parts = [];
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    if (isSensitive(key)) continue;
    const oldVal = oldData && oldData[key];
    const newVal = newData && newData[key];
    if (JSON.stringify(safeValue(oldVal)) === JSON.stringify(safeValue(newVal))) continue;
    oldValues[key] = oldVal;
    newValues[key] = newVal;
    const label = humanFieldName(key);
    if (oldVal === undefined || oldVal === null) {
      parts.push(`${label} set to ${safeValue(newVal)}`);
    } else if (newVal === undefined || newVal === null) {
      parts.push(`${label} removed (was ${safeValue(oldVal)})`);
    } else {
      parts.push(`${label} changed from ${safeValue(oldVal)} to ${safeValue(newVal)}`);
    }
  }

  const summary = parts.length > 0 ? parts.join('. ') : (options.summaryFallback || 'Updated');
  return { summary, oldValues, newValues };
}

function buildActionSummary(actionType, entityType, entityLabel, userLabel, extra = '') {
  const entity = entityLabel || entityType || 'record';
  const by = userLabel ? ` by ${userLabel}` : '';
  const tail = extra ? `. ${extra}` : '';
  switch (actionType) {
    case 'CREATE':
      return `${entityType || 'Record'} "${entity}" created${by}${tail}`.trim();
    case 'DELETE':
      return `${entityType || 'Record'} "${entity}" deleted${by}${tail}`.trim();
    case 'VIEW':
    case 'DOWNLOAD':
      return `${entityType || 'Record'} "${entity}" viewed/downloaded${by}${tail}`.trim();
    case 'RESTORE':
      return `${entityType || 'Record'} "${entity}" restored to previous version${by}${tail}`.trim();
    case 'LOGIN':
      return `User logged in${by}${tail}`.trim();
    case 'LOGOUT':
      return `User logged out${by}${tail}`.trim();
    case 'UPDATE':
      return `${entityType || 'Record'} "${entity}" updated${by}${tail}`.trim();
    case 'ASSIGN':
      return `${entityType || 'Record'} "${entity}" assignment changed${by}${tail}`.trim();
    default:
      return `${actionType} ${entityType || ''} ${entity}${by}${tail}`.trim();
  }
}

module.exports = { generateChangeSummary, buildActionSummary, humanFieldName };
