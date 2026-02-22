const { sequelize, CaseHearing, HearingReminder, Case, Client, OrganizationUser, Judge } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');
const cache = require('../utils/cache');

function buildHearingWhere(user) {
  const base = { organization_id: user.organization_id };
  if (user.role === 'ORG_ADMIN') return base;
  return {
    ...base,
    [Op.or]: [
      { created_by: user.id },
      { '$Case.assigned_to$': user.id }
    ]
  };
}

async function getHearingWithAccess(hearingId, user) {
  const where = { ...buildHearingWhere(user), is_deleted: false };
  const hearing = await CaseHearing.findOne({
    where: { id: hearingId, ...where },
    include: [
      { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number', 'client_id'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
      { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] },
      { model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] },
      { model: HearingReminder, as: 'HearingReminders', order: [['reminder_time', 'ASC']] }
    ]
  });
  return hearing;
}

const createHearing = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const { case_id, hearing_date, courtroom, courtroom_id, judge_id, bench_id, hearing_type, status, remarks, reminder_times, outcome_status, outcome_notes, next_hearing_date } = req.body;

    const caseRecord = await Case.findOne({
      where: { id: case_id, organization_id: user.organization_id, is_deleted: false }
    });
    if (!caseRecord) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Case not found or access denied' });
    }

    const lastHearing = await CaseHearing.findOne({
      where: { case_id: caseRecord.id, is_deleted: false },
      order: [['hearing_number', 'DESC'], ['hearing_date', 'DESC']],
      attributes: ['id', 'hearing_number']
    });
    const hearingNumber = (lastHearing?.hearing_number ?? 0) + 1;
    const previousHearingId = lastHearing?.id || null;
    const judgeIdForHearing = judge_id || caseRecord.judge_id || null;
    if (judgeIdForHearing) {
      const judge = await Judge.findOne({
        where: { id: judgeIdForHearing, organization_id: user.organization_id },
        attributes: ['id', 'status']
      });
      if (judge && judge.status !== 'active') {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Cannot assign inactive or transferred judge to hearing' });
      }
    }

    const hearing = await CaseHearing.create({
      case_id,
      organization_id: user.organization_id,
      created_by: user.id,
      hearing_date: hearing_date ? new Date(hearing_date) : null,
      courtroom: courtroom || null,
      courtroom_id: courtroom_id || null,
      judge_id: judgeIdForHearing,
      bench_id: bench_id || null,
      hearing_type: hearing_type || 'REGULAR',
      status: status || 'UPCOMING',
      remarks: remarks || null,
      reminder_sent: false,
      hearing_number: hearingNumber,
      previous_hearing_id: previousHearingId,
      outcome_status: outcome_status || null,
      outcome_notes: outcome_notes || null,
      next_hearing_date: next_hearing_date || null,
      is_deleted: false
    }, { transaction: t });
    const completedStatuses = ['completed', 'disposed'];
    if (outcome_status && completedStatuses.includes(String(outcome_status).toLowerCase())) {
      await caseRecord.update({ case_lifecycle_status: 'Closed' }, { transaction: t });
    }

    if (Array.isArray(reminder_times) && reminder_times.length) {
      const reminders = reminder_times.map((r) => ({
        hearing_id: hearing.id,
        reminder_time: r.reminder_time ? new Date(r.reminder_time) : null,
        reminder_type: r.reminder_type || 'SYSTEM',
        is_sent: false
      })).filter((r) => r.reminder_time);
      await HearingReminder.bulkCreate(reminders, { transaction: t });
    }
    await t.commit();
    const created = await getHearingWithAccess(hearing.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : hearing.toJSON()
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateHearing = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    const { hearing_date, courtroom, courtroom_id, judge_id, bench_id, hearing_type, status, remarks, outcome_status, outcome_notes, next_hearing_date } = req.body;
    const updates = {};
    if (hearing_date !== undefined) updates.hearing_date = hearing_date ? new Date(hearing_date) : null;
    if (courtroom !== undefined) updates.courtroom = courtroom || null;
    if (courtroom_id !== undefined) updates.courtroom_id = courtroom_id || null;
    if (judge_id !== undefined) updates.judge_id = judge_id || null;
    if (bench_id !== undefined) updates.bench_id = bench_id || null;
    if (hearing_type !== undefined) updates.hearing_type = hearing_type;
    if (status !== undefined) updates.status = status;
    if (remarks !== undefined) updates.remarks = remarks || null;
    if (outcome_status !== undefined) updates.outcome_status = outcome_status || null;
    if (outcome_notes !== undefined) updates.outcome_notes = outcome_notes || null;
    if (next_hearing_date !== undefined) updates.next_hearing_date = next_hearing_date || null;
    const oldSnapshot = hearing.toJSON();
    await hearing.update(updates);
    const completedStatuses = ['completed', 'disposed'];
    if (updates.outcome_status && completedStatuses.includes(String(updates.outcome_status).toLowerCase())) {
      const caseRecord = await Case.findOne({ where: { id: hearing.case_id } });
      if (caseRecord) await caseRecord.update({ case_lifecycle_status: 'Closed' });
    }
    const updated = await getHearingWithAccess(hearing.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, ...updates }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteHearing = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    const oldSnapshot = hearing.toJSON();
    await hearing.update({ is_deleted: true });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: { ...oldSnapshot, is_deleted: true }
    });
    res.json({ success: true, message: 'Hearing deleted' });
  } catch (err) {
    next(err);
  }
};

const getHearingById = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    res.json({ success: true, data: hearing });
  } catch (err) {
    next(err);
  }
};

const listHearings = async (req, res, next) => {
  try {
    const user = req.user;
    const where = { ...buildHearingWhere(user), is_deleted: false };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    if (req.query.start || req.query.end) {
      where.hearing_date = {};
      if (req.query.start) where.hearing_date[Op.gte] = new Date(req.query.start);
      if (req.query.end) where.hearing_date[Op.lte] = new Date(req.query.end);
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.hearing_type) where.hearing_type = req.query.hearing_type;

    const include = [
      { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number', 'client_id'], required: true, include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] }
    ];

    const { count, rows } = await CaseHearing.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['hearing_date', 'ASC']],
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    });
  } catch (err) {
    next(err);
  }
};

const getCalendarView = async (req, res, next) => {
  try {
    const user = req.user;
    const where = { ...buildHearingWhere(user), is_deleted: false };
    const start = req.query.start ? new Date(req.query.start) : new Date(new Date().setDate(1));
    const end = req.query.end ? new Date(req.query.end) : new Date(new Date().setMonth(start.getMonth() + 1));
    where.hearing_date = { [Op.gte]: start, [Op.lte]: end };
    if (req.query.status) where.status = req.query.status;

    const include = [
      { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number', 'client_id'], required: true, include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] }
    ];

    const hearings = await CaseHearing.findAll({
      where,
      include,
      order: [['hearing_date', 'ASC']]
    });

    const byDate = {};
    hearings.forEach((h) => {
      const d = h.hearing_date ? new Date(h.hearing_date).toISOString().slice(0, 10) : 'none';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(h);
    });

    res.json({ success: true, data: hearings, byDate });
  } catch (err) {
    next(err);
  }
};

const getDashboardHearings = async (req, res, next) => {
  try {
    const user = req.user;
    const key = cache.cacheKey('dashboard:hearing', [user.organization_id, user.id]);
    const cached = await cache.get(key);
    if (cached) return res.json(cached);
    const where = { ...buildHearingWhere(user), is_deleted: false };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const weekEnd = new Date(todayStart.getTime() + 8 * 24 * 60 * 60 * 1000);

    const include = [
      { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], required: true, include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] }
    ];

    const [todays, upcoming, overdue] = await Promise.all([
      CaseHearing.findAll({
        where: { ...where, hearing_date: { [Op.gte]: todayStart, [Op.lte]: todayEnd }, status: 'UPCOMING' },
        include,
        order: [['hearing_date', 'ASC']]
      }),
      CaseHearing.findAll({
        where: { ...where, hearing_date: { [Op.gt]: todayEnd, [Op.lte]: weekEnd }, status: 'UPCOMING' },
        include,
        order: [['hearing_date', 'ASC']],
        limit: 10
      }),
      CaseHearing.findAll({
        where: { ...where, hearing_date: { [Op.lt]: todayStart }, status: 'UPCOMING' },
        include,
        order: [['hearing_date', 'DESC']],
        limit: 5
      })
    ]);

    const payload = { success: true, data: { todays, upcoming, overdue } };
    await cache.set(key, payload, cache.TTL.DASHBOARD);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const listReminders = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    const reminders = await HearingReminder.findAll({
      where: { hearing_id: hearing.id },
      order: [['reminder_time', 'ASC']]
    });
    res.json({ success: true, data: reminders });
  } catch (err) {
    next(err);
  }
};

const addReminder = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    const { reminder_time, reminder_type } = req.body;
    const reminder = await HearingReminder.create({
      hearing_id: hearing.id,
      reminder_time: reminder_time ? new Date(reminder_time) : null,
      reminder_type: reminder_type || 'SYSTEM',
      is_sent: false
    });
    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

const removeReminder = async (req, res, next) => {
  try {
    const user = req.user;
    const hearing = await getHearingWithAccess(req.params.id, user);
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    const reminder = await HearingReminder.findOne({
      where: { id: req.params.reminderId, hearing_id: hearing.id }
    });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    await reminder.destroy();
    res.json({ success: true, message: 'Reminder removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createHearing,
  updateHearing,
  deleteHearing,
  getHearingById,
  listHearings,
  getCalendarView,
  getDashboardHearings,
  listReminders,
  addReminder,
  removeReminder
};
