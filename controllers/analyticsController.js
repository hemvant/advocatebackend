const { sequelize, Case, CaseHearing, CaseTask, Court, Judge, OrganizationUser } = require('../models');
const { Op } = require('sequelize');
const cache = require('../utils/cache');

/**
 * 1. Average case duration (days) per court.
 * Uses closed cases only: duration = updated_at - filing_date, AVG per court.
 * Chart: { labels: court names, datasets: [{ label: 'Avg duration (days)', data: [] }] }
 */
async function getCaseDurationByCourt(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const cacheKey = cache.cacheKey('analytics:case-duration', [orgId]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const rows = await sequelize.query(
      `SELECT c.id AS court_id, c.name AS court_name,
              AVG(DATEDIFF(cs.updated_at, cs.filing_date)) AS avg_duration_days,
              COUNT(cs.id) AS case_count
       FROM cases cs
       INNER JOIN courts c ON c.id = cs.court_id AND c.organization_id = :orgId
       WHERE cs.organization_id = :orgId AND cs.is_deleted = 0
         AND cs.status = 'CLOSED' AND cs.filing_date IS NOT NULL
       GROUP BY c.id, c.name
       ORDER BY avg_duration_days ASC`,
      { replacements: { orgId }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    const byCourt = Array.isArray(rows) ? rows : [];
    const labels = byCourt.map((r) => r.court_name || 'Unknown');
    const data = byCourt.map((r) => Math.round(Number(r.avg_duration_days) || 0));

    const payload = {
      success: true,
      chart: {
        labels,
        datasets: [{ label: 'Avg duration (days)', data }]
      },
      raw: byCourt.map((r) => ({
        court_id: r.court_id,
        court_name: r.court_name,
        avg_duration_days: Math.round(Number(r.avg_duration_days) || 0),
        case_count: Number(r.case_count) || 0
      }))
    };
    await cache.set(cacheKey, payload, cache.TTL.REPORTS);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Judge performance: cases assigned, hearings conducted.
 * Chart: labels = judge names, datasets: Cases, Hearings.
 */
async function getJudgePerformance(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const cacheKey = cache.cacheKey('analytics:judge-perf', [orgId]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const judges = await Judge.findAll({
      where: { organization_id: orgId, is_active: true },
      attributes: ['id', 'name', 'designation', 'court_id'],
      include: [{ model: Court, as: 'Court', attributes: ['id', 'name'], required: false }]
    });

    const caseCounts = await Case.findAll({
      where: { organization_id: orgId, is_deleted: false, judge_id: { [Op.ne]: null } },
      attributes: ['judge_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['judge_id'],
      raw: true
    });
    const hearingCounts = await CaseHearing.findAll({
      where: { organization_id: orgId, judge_id: { [Op.ne]: null } },
      attributes: ['judge_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['judge_id'],
      raw: true
    });

    const casesByJudge = {};
    caseCounts.forEach((r) => { casesByJudge[r.judge_id] = Number(r.count) || 0; });
    const hearingsByJudge = {};
    hearingCounts.forEach((r) => { hearingsByJudge[r.judge_id] = Number(r.count) || 0; });

    const labels = [];
    const casesData = [];
    const hearingsData = [];
    const raw = [];

    judges.forEach((j) => {
      labels.push(j.name || 'Unknown');
      const c = casesByJudge[j.id] || 0;
      const h = hearingsByJudge[j.id] || 0;
      casesData.push(c);
      hearingsData.push(h);
      raw.push({
        judge_id: j.id,
        judge_name: j.name,
        designation: j.designation,
        court_name: j.Court ? j.Court.name : null,
        cases_assigned: c,
        hearings_conducted: h
      });
    });

    const payload = {
      success: true,
      chart: {
        labels,
        datasets: [
          { label: 'Cases assigned', data: casesData },
          { label: 'Hearings conducted', data: hearingsData }
        ]
      },
      raw
    };
    await cache.set(cacheKey, payload, cache.TTL.REPORTS);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Employee productivity: cases handled, tasks completed, hearings attended.
 * Score = weighted sum or simple breakdown for charts.
 */
async function getEmployeeProductivity(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const cacheKey = cache.cacheKey('analytics:employee-productivity', [orgId]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const employees = await OrganizationUser.findAll({
      where: { organization_id: orgId },
      attributes: ['id', 'name', 'email'],
      raw: true
    });

    const caseHandled = await sequelize.query(
      `SELECT u.id AS user_id,
              (SELECT COUNT(*) FROM cases c WHERE (c.created_by = u.id OR c.assigned_to = u.id) AND c.organization_id = :orgId AND c.is_deleted = 0) AS cnt
       FROM organization_users u WHERE u.organization_id = :orgId`,
      { replacements: { orgId }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);
    const tasksDone = await CaseTask.findAll({
      where: { organization_id: orgId, status: 'COMPLETED' },
      attributes: ['assigned_to', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['assigned_to'],
      raw: true
    });
    const hearingsAttended = await CaseHearing.findAll({
      where: { organization_id: orgId },
      attributes: ['created_by', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['created_by'],
      raw: true
    });

    const casesByUser = {};
    (Array.isArray(caseHandled) ? caseHandled : []).forEach((r) => { casesByUser[r.user_id] = Number(r.cnt) || 0; });
    const tasksByUser = {};
    tasksDone.forEach((r) => { tasksByUser[r.assigned_to] = Number(r.count) || 0; });
    const hearingsByUser = {};
    hearingsAttended.forEach((r) => { hearingsByUser[r.created_by] = Number(r.count) || 0; });

    const rawList = employees.map((e) => {
      const casesHandled = casesByUser[e.id] || 0;
      const tasksCompleted = tasksByUser[e.id] || 0;
      const hearingsAttendedCount = hearingsByUser[e.id] || 0;
      const score = casesHandled * 2 + tasksCompleted + hearingsAttendedCount;
      return {
        user_id: e.id,
        name: e.name,
        email: e.email,
        cases_handled: casesHandled,
        tasks_completed: tasksCompleted,
        hearings_attended: hearingsAttendedCount,
        productivity_score: score
      };
    }).filter((e) => e.cases_handled > 0 || e.tasks_completed > 0 || e.hearings_attended > 0)
    .sort((a, b) => (b.productivity_score - a.productivity_score));

    const labels = rawList.map((r) => r.name || r.email || 'Unknown');
    const payload = {
      success: true,
      chart: {
        labels,
        datasets: [
          { label: 'Cases handled', data: rawList.map((r) => r.cases_handled) },
          { label: 'Tasks completed', data: rawList.map((r) => r.tasks_completed) },
          { label: 'Hearings attended', data: rawList.map((r) => r.hearings_attended) }
        ]
      },
      raw: rawList
    };
    await cache.set(cacheKey, payload, cache.TTL.REPORTS);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Case aging buckets: 0-30 days, 30-90 days, 90+ days from filing (or created_at).
 */
async function getCaseAgingBuckets(req, res, next) {
  try {
    const orgId = req.user.organization_id;
    const cacheKey = cache.cacheKey('analytics:case-aging', [orgId]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const rows = await sequelize.query(
      `SELECT
        SUM(CASE WHEN (COALESCE(cs.filing_date, DATE(cs.created_at)) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) THEN 1 ELSE 0 END) AS bucket_0_30,
        SUM(CASE WHEN (COALESCE(cs.filing_date, DATE(cs.created_at)) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                     AND COALESCE(cs.filing_date, DATE(cs.created_at)) < DATE_SUB(CURDATE(), INTERVAL 30 DAY)) THEN 1 ELSE 0 END) AS bucket_30_90,
        SUM(CASE WHEN (COALESCE(cs.filing_date, DATE(cs.created_at)) < DATE_SUB(CURDATE(), INTERVAL 90 DAY)) THEN 1 ELSE 0 END) AS bucket_90_plus
       FROM cases cs
       WHERE cs.organization_id = :orgId AND cs.is_deleted = 0`,
      { replacements: { orgId }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    const r = (Array.isArray(rows) && rows[0]) ? rows[0] : {};
    const b0_30 = Number(r.bucket_0_30) || 0;
    const b30_90 = Number(r.bucket_30_90) || 0;
    const b90 = Number(r.bucket_90_plus) || 0;

    const payload = {
      success: true,
      chart: {
        labels: ['0-30 days', '30-90 days', '90+ days'],
        datasets: [{ label: 'Cases', data: [b0_30, b30_90, b90] }]
      },
      raw: [
        { bucket: '0-30 days', min_days: 0, max_days: 30, count: b0_30 },
        { bucket: '30-90 days', min_days: 30, max_days: 90, count: b30_90 },
        { bucket: '90+ days', min_days: 90, max_days: null, count: b90 }
      ]
    };
    await cache.set(cacheKey, payload, cache.TTL.REPORTS);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCaseDurationByCourt,
  getJudgePerformance,
  getEmployeeProductivity,
  getCaseAgingBuckets
};
