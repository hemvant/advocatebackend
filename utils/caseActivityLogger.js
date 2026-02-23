'use strict';

const { CaseActivityLog } = require('../models');

/**
 * Log a case/task activity for timeline. Does not throw; logs errors to console.
 * @param {object} params
 * @param {number} params.organization_id
 * @param {number} params.case_id
 * @param {number|null} params.task_id
 * @param {number} params.user_id
 * @param {string} params.activity_type - CASE_CREATED, CASE_ASSIGNED, TASK_COMPLETED, etc.
 * @param {string} params.activity_summary - Human-readable summary
 */
async function logCaseActivity(params) {
  const { organization_id, case_id, task_id, user_id, activity_type, activity_summary } = params;
  if (!organization_id || !case_id || !user_id || !activity_type) return;
  try {
    await CaseActivityLog.create({
      organization_id,
      case_id,
      task_id: task_id ?? null,
      user_id,
      activity_type,
      activity_summary: activity_summary ? String(activity_summary).slice(0, 65535) : null
    });
  } catch (err) {
    console.error('[caseActivityLogger] logCaseActivity failed:', err.message);
  }
}

module.exports = { logCaseActivity };
