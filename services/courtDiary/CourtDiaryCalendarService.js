'use strict';

const { CaseHearing, Case, Client, Court, Judge, OrganizationUser } = require('../../models');
const { Op } = require('sequelize');

/**
 * Fetches calendar/diary data with filters (advocate, court, case type).
 * Multi-org: all queries scoped by organization_id.
 */
class CourtDiaryCalendarService {
  /**
   * Build base where for hearings (org + optional role filter).
   * @param {Object} user - { organization_id, role, id }
   * @param {Object} filters - { advocate_id (assigned_to), court_id, case_type }
   */
  /**
   * @param {Object} user
   * @param {Object} opts - { start, end, status, advocate_id, court_id, case_type }
   */
  static async getCalendarHearings(user, opts) {
    const base = { organization_id: user.organization_id, is_deleted: false };
    if (user.role !== 'ORG_ADMIN') {
      base[Op.or] = [{ created_by: user.id }, { '$Case.assigned_to$': user.id }];
    }
    if (opts.start || opts.end) {
      base.hearing_date = {};
      if (opts.start) base.hearing_date[Op.gte] = new Date(opts.start);
      if (opts.end) base.hearing_date[Op.lte] = new Date(opts.end);
    }
    if (opts.status) base.status = opts.status;

    const caseWhere = {};
    if (opts.advocate_id) caseWhere.assigned_to = opts.advocate_id;
    if (opts.court_id) caseWhere.court_id = opts.court_id;
    if (opts.case_type) caseWhere.case_type = opts.case_type;

    const include = [
      {
        model: Case,
        as: 'Case',
        required: true,
        where: Object.keys(caseWhere).length ? caseWhere : undefined,
        attributes: ['id', 'case_title', 'case_number', 'client_id', 'assigned_to', 'court_id', 'case_type', 'status'],
        include: [
          { model: Client, as: 'Client', attributes: ['id', 'name'] },
          { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name'] },
          { model: Court, as: 'Court', attributes: ['id', 'name'] }
        ]
      },
      { model: Judge, as: 'Judge', attributes: ['id', 'name'] }
    ];

    const hearings = await CaseHearing.findAll({
      where: base,
      include,
      order: [['hearing_date', 'ASC']]
    });

    const byDate = {};
    hearings.forEach((h) => {
      const d = h.hearing_date ? new Date(h.hearing_date).toISOString().slice(0, 10) : 'none';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(h);
    });

    return { data: hearings, byDate };
  }

  /**
   * Get diary for a single date (for PDF / printable list). Grouped by court then time.
   * @param {Object} user
   * @param {string} date - YYYY-MM-DD
   * @param {Object} filters - advocate_id, court_id, case_type
   */
  static async getDiaryForDate(user, date, filters = {}) {
    const start = new Date(date + 'T00:00:00');
    const end = new Date(date + 'T23:59:59.999');
    const { data } = await CourtDiaryCalendarService.getCalendarHearings(user, {
      start: start.toISOString(),
      end: end.toISOString(),
      ...filters
    });
    const withCase = data.filter((h) => h.Case);
    const byCourt = {};
    withCase.forEach((h) => {
      const courtName = h.Case?.Court?.name || 'Other';
      if (!byCourt[courtName]) byCourt[courtName] = [];
      byCourt[courtName].push(h);
    });
    Object.keys(byCourt).forEach((courtName) => {
      byCourt[courtName].sort((a, b) => (new Date(a.hearing_date) - new Date(b.hearing_date)));
    });
    return { date, byCourt, hearings: withCase };
  }
}

module.exports = CourtDiaryCalendarService;
