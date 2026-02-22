const { getSetupStatus } = require('../utils/setupService');

const getStatus = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const status = await getSetupStatus(orgId);
    res.json({
      success: true,
      data: {
        clients_count: status.clients_count,
        courts_count: status.courts_count,
        judges_count: status.judges_count,
        cases_count: status.cases_count,
        missing_master_data: status.missing_master_data,
        has_clients: status.has_clients,
        has_courts: status.has_courts,
        has_judges: status.has_judges,
        has_cases: status.has_cases,
        is_initial_setup_complete: status.is_initial_setup_complete
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatus };
