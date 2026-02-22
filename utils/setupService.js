const { Client, Court, Judge, Case, OrganizationSetupProgress } = require('../models');

/**
 * Refresh organization setup progress from actual counts. Call after creating client, court, judge, or case.
 * @param {number} organizationId
 */
async function refreshSetupProgress(organizationId) {
  const [clientsCount, courtsCount, judgesCount, casesCount] = await Promise.all([
    Client.count({ where: { organization_id: organizationId, is_deleted: false } }),
    Court.count({ where: { organization_id: organizationId } }),
    Judge.count({ where: { organization_id: organizationId } }),
    Case.count({ where: { organization_id: organizationId, is_deleted: false } })
  ]);

  const has_clients = clientsCount > 0;
  const has_courts = courtsCount > 0;
  const has_judges = judgesCount > 0;
  const has_cases = casesCount > 0;
  const is_initial_setup_complete = has_clients && has_courts && has_judges && has_cases;

  const [progress] = await OrganizationSetupProgress.findOrCreate({
    where: { organization_id: organizationId },
    defaults: {
      has_clients,
      has_courts,
      has_judges,
      has_cases,
      is_initial_setup_complete
    }
  });

  await progress.update({
    has_clients,
    has_courts,
    has_judges,
    has_cases,
    is_initial_setup_complete
  });

  return { has_clients, has_courts, has_judges, has_cases, is_initial_setup_complete };
}

/**
 * Get setup status for organization: counts and missing master data.
 * @param {number} organizationId
 */
async function getSetupStatus(organizationId) {
  const [clientsCount, courtsCount, judgesCount, casesCount] = await Promise.all([
    Client.count({ where: { organization_id: organizationId, is_deleted: false } }),
    Court.count({ where: { organization_id: organizationId } }),
    Judge.count({ where: { organization_id: organizationId } }),
    Case.count({ where: { organization_id: organizationId, is_deleted: false } })
  ]);

  const missing_master_data = [];
  if (clientsCount === 0) missing_master_data.push('clients');
  if (courtsCount === 0) missing_master_data.push('courts');
  if (judgesCount === 0) missing_master_data.push('judges');

  const [progress] = await OrganizationSetupProgress.findOrCreate({
    where: { organization_id: organizationId },
    defaults: {
      has_clients: clientsCount > 0,
      has_courts: courtsCount > 0,
      has_judges: judgesCount > 0,
      has_cases: casesCount > 0,
      is_initial_setup_complete: clientsCount > 0 && courtsCount > 0 && judgesCount > 0 && casesCount > 0
    }
  });

  // Keep progress row in sync
  const has_clients = clientsCount > 0;
  const has_courts = courtsCount > 0;
  const has_judges = judgesCount > 0;
  const has_cases = casesCount > 0;
  const is_initial_setup_complete = has_clients && has_courts && has_judges && has_cases;
  await progress.update({
    has_clients,
    has_courts,
    has_judges,
    has_cases,
    is_initial_setup_complete
  });

  return {
    clients_count: clientsCount,
    courts_count: courtsCount,
    judges_count: judgesCount,
    cases_count: casesCount,
    missing_master_data,
    has_clients: progress.has_clients,
    has_courts: progress.has_courts,
    has_judges: progress.has_judges,
    has_cases: progress.has_cases,
    is_initial_setup_complete: progress.is_initial_setup_complete
  };
}

module.exports = { refreshSetupProgress, getSetupStatus };
