'use strict';

const cron = require('node-cron');
const { Case } = require('../models');
const { Op } = require('sequelize');
const { fetchCaseStatusByCNR } = require('../services/ecourtSyncService');
const auditLogger = require('./auditLogger');
const logger = require('./logger');

async function runECourtSyncJob() {
  const cases = await Case.findAll({
    where: {
      is_deleted: false,
      auto_sync_enabled: true,
      cnr_number: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
    },
    attributes: ['id', 'organization_id', 'cnr_number', 'external_status', 'external_next_hearing_date', 'last_synced_at', 'case_number']
  }).catch((err) => {
    logger.warn('[ECourtSync] Job failed to load cases:', err.message);
    return [];
  });

  if (cases.length === 0) return;

  logger.info('[ECourtSync] Job running for ' + cases.length + ' case(s)');

  for (const caseRecord of cases) {
    const cnr = (caseRecord.cnr_number || '').trim();
    if (!cnr) continue;

    const result = await fetchCaseStatusByCNR(cnr);
    if (!result.success) {
      logger.warn('[ECourtSync] Case id=' + caseRecord.id + ' cnr=' + cnr + ' error: ' + (result.error || 'unknown'));
      continue;
    }

    const { status, next_hearing_date } = result.data || {};
    const oldSnapshot = {
      external_status: caseRecord.external_status,
      external_next_hearing_date: caseRecord.external_next_hearing_date,
      last_synced_at: caseRecord.last_synced_at ? caseRecord.last_synced_at.toISOString() : null
    };
    const now = new Date();
    const updates = {
      external_status: status != null ? String(status) : caseRecord.external_status,
      external_next_hearing_date: next_hearing_date || null,
      last_synced_at: now
    };

    try {
      await caseRecord.update(updates);
      await auditLogger.logAudit({
        organization_id: caseRecord.organization_id,
        user: null,
        module_name: 'CASE_MANAGEMENT',
        entity_type: 'CASE',
        entity_id: caseRecord.id,
        action_type: 'UPDATE',
        oldData: oldSnapshot,
        newData: { ...oldSnapshot, ...updates },
        action_summary: `eCourts auto-sync: case ${caseRecord.case_number || caseRecord.id} updated from eCourts (status: ${updates.external_status || '—'}, next hearing: ${updates.external_next_hearing_date || '—'}).`,
        entity_label: caseRecord.case_number || 'Case ' + caseRecord.id,
        req: null
      });
    } catch (err) {
      logger.warn('[ECourtSync] Case id=' + caseRecord.id + ' update failed:', err.message);
    }
  }
}

function initECourtSyncCron() {
  cron.schedule('0 6 * * *', () => {
    runECourtSyncJob().catch((err) => logger.warn('[ECourtSync] Job error:', err.message));
  }, { scheduled: true });
  logger.info('eCourts sync cron: daily at 6:00 AM');
}

module.exports = { initECourtSyncCron, runECourtSyncJob };
