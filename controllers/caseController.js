const { sequelize, Case, CaseHearing, CaseDocument, Client, OrganizationUser, Court, CourtType, CourtBench, Judge, Courtroom, CasePermission, CaseAssignmentHistory, CaseAssignmentChange, CaseJudgeHistory, CaseActivityLog } = require('../models');
const { refreshSetupProgress } = require('../utils/setupService');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');
const cache = require('../utils/cache');
const { cursorByIdDesc, cursorFromRow } = require('../utils/pagination');
const { logCaseActivity } = require('../utils/caseActivityLogger');
const { fetchCaseStatusByCNR } = require('../services/ecourtSyncService');
const { queueWhatsAppMessage } = require('../utils/whatsappQueue');
const aiService = require('../utils/aiService');

async function buildCaseWhere(user) {
  const base = { organization_id: user.organization_id, is_deleted: false };
  if (user.role === 'ORG_ADMIN') return base;
  const permRows = await CasePermission.findAll({ where: { user_id: user.id }, attributes: ['case_id'], raw: true });
  const permCaseIds = permRows.map((r) => r.case_id);
  const orClauses = [{ created_by: user.id }, { assigned_to: user.id }];
  if (permCaseIds.length) orClauses.push({ id: { [Op.in]: permCaseIds } });
  return { ...base, [Op.or]: orClauses };
}

async function generateCaseNumber(organizationId) {
  const year = new Date().getFullYear();
  const prefix = `ORG-${year}-`;
  const last = await Case.findOne({
    where: { organization_id: organizationId, case_number: { [Op.like]: `${prefix}%` } },
    order: [['case_number', 'DESC']],
    attributes: ['case_number']
  });
  let next = 1;
  if (last && last.case_number) {
    const match = last.case_number.match(new RegExp(`^ORG-${year}-(\\d+)$`));
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function getCaseWithAccess(caseId, user) {
  const where = await buildCaseWhere(user);
  const caseRecord = await Case.findOne({
    where: { id: caseId, ...where },
    include: [
      { model: Client, as: 'Client', attributes: ['id', 'name', 'email', 'phone'] },
      { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name', 'email'] },
      { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email', 'phone'] },
      { model: OrganizationUser, as: 'AssignedByUser', attributes: ['id', 'name'] },
      { model: Court, as: 'Court', attributes: ['id', 'name'], include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }] },
      { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] },
      { model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] },
      { model: Courtroom, as: 'Courtroom', attributes: ['id', 'room_number', 'floor'] },
      {
        model: CaseHearing,
        as: 'CaseHearings',
        where: { is_deleted: false },
        required: false,
        include: [
          { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] },
          { model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] }
        ]
      },
      { model: CaseDocument, as: 'CaseDocuments', include: [{ model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }] },
      {
        model: CaseAssignmentHistory,
        as: 'AssignmentHistory',
        include: [
          { model: OrganizationUser, as: 'Employee', attributes: ['id', 'name', 'email', 'status'] },
          { model: OrganizationUser, as: 'AssignedByUser', attributes: ['id', 'name'] }
        ],
        order: [['assigned_at', 'DESC']]
      },
      {
        model: CaseJudgeHistory,
        as: 'JudgeHistory',
        include: [{ model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation', 'status'] }],
        order: [['assigned_at', 'DESC']]
      }
    ],
  });
  if (caseRecord && caseRecord.CaseHearings && caseRecord.CaseHearings.length) {
    caseRecord.CaseHearings.sort((a, b) => {
      const n = (a.hearing_number ?? 999999) - (b.hearing_number ?? 999999);
      if (n !== 0) return n;
      return (a.hearing_date || '').localeCompare(b.hearing_date || '');
    });
  }
  return caseRecord;
}

const createCase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const { client_id, case_title, case_number, court_id, bench_id, judge_id, courtroom_id, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to } = req.body;

    const [clientsCount, courtsCount] = await Promise.all([
      Client.count({ where: { organization_id: user.organization_id, is_deleted: false } }),
      Court.count({ where: { organization_id: user.organization_id } })
    ]);
    const missing = [];
    if (clientsCount === 0) missing.push('clients');
    if (courtsCount === 0) missing.push('courts');
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing Master Data',
        missing,
        message: 'Please create required master data before creating a case.'
      });
    }

    const client = await Client.findOne({
      where: { id: client_id, organization_id: user.organization_id, is_deleted: false }
    });
    if (!client) return res.status(400).json({ success: false, message: 'Client not found or does not belong to your organization' });

    let finalCourtId = null; let finalBenchId = null; let finalJudgeId = null; let finalCourtroomId = null;
    if (court_id) {
      const court = await Court.findOne({ where: { id: court_id, organization_id: user.organization_id } });
      if (!court) { await t.rollback(); return res.status(400).json({ success: false, message: 'Court not found' }); }
      finalCourtId = court.id;
    }
    if (bench_id && finalCourtId) {
      const bench = await CourtBench.findOne({ where: { id: bench_id, court_id: finalCourtId } });
      if (!bench) { await t.rollback(); return res.status(400).json({ success: false, message: 'Bench not found' }); }
      finalBenchId = bench.id;
    }
    if (judge_id) {
      const judge = await Judge.findOne({ where: { id: judge_id, organization_id: user.organization_id } });
      if (!judge) { await t.rollback(); return res.status(400).json({ success: false, message: 'Judge not found' }); }
      finalJudgeId = judge.id;
    }
    if (courtroom_id && finalCourtId) {
      const room = await Courtroom.findOne({ where: { id: courtroom_id, court_id: finalCourtId } });
      if (!room) { await t.rollback(); return res.status(400).json({ success: false, message: 'Courtroom not found' }); }
      finalCourtroomId = room.id;
    }

    const caseTitleTrim = (case_title || '').trim();
    if (!caseTitleTrim) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Case title is required' });
    }
    const existingByTitle = await Case.findOne({
      where: { organization_id: user.organization_id, case_title: caseTitleTrim, is_deleted: false }
    });
    if (existingByTitle) {
      await t.rollback();
      return res.status(409).json({ success: false, message: 'Case title already exists in this organization' });
    }

    let finalCaseNumber = (case_number || '').trim();
    if (!finalCaseNumber) {
      finalCaseNumber = await generateCaseNumber(user.organization_id);
    } else {
      const existing = await Case.findOne({
        where: { organization_id: user.organization_id, case_number: finalCaseNumber }
      });
      if (existing) {
        await t.rollback();
        return res.status(409).json({ success: false, message: 'Case number already exists in this organization' });
      }
    }

    const now = new Date();
    const caseRecord = await Case.create({
      organization_id: user.organization_id,
      client_id,
      created_by: user.id,
      assigned_to: assigned_to || null,
      assigned_at: assigned_to ? now : null,
      assigned_by: assigned_to ? user.id : null,
      case_title: caseTitleTrim,
      case_number: finalCaseNumber,
      court_id: finalCourtId,
      bench_id: finalBenchId,
      judge_id: finalJudgeId,
      courtroom_id: finalCourtroomId,
      case_type: case_type || 'OTHER',
      status: status || 'DRAFT',
      priority: priority || 'MEDIUM',
      filing_date: filing_date || null,
      next_hearing_date: next_hearing_date || null,
      description: description || null,
      is_deleted: false
    }, { transaction: t });
    let assigneeName = null;
    if (assigned_to) {
      const emp = await OrganizationUser.findOne({
        where: { id: assigned_to, organization_id: user.organization_id },
        attributes: ['id', 'name', 'status']
      });
      if (!emp) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Assigned employee not found' });
      }
      if (emp.status !== 'active') {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Cannot assign case to inactive or left employee' });
      }
      assigneeName = emp.name;
      await CaseAssignmentHistory.create({
        case_id: caseRecord.id,
        employee_id: assigned_to,
        assigned_at: now,
        assigned_by: user.id,
        reason: null
      }, { transaction: t });
      await CaseAssignmentChange.create({
        organization_id: user.organization_id,
        case_id: caseRecord.id,
        previous_assigned_to: null,
        new_assigned_to: assigned_to,
        changed_by: user.id,
        change_reason: null
      }, { transaction: t });
    }
    if (finalJudgeId) {
      const judge = await Judge.findOne({
        where: { id: finalJudgeId, organization_id: user.organization_id },
        attributes: ['id', 'status', 'is_active']
      });
      if (judge && judge.status !== 'active') {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Cannot assign inactive or transferred judge' });
      }
      await CaseJudgeHistory.create({
        case_id: caseRecord.id,
        judge_id: finalJudgeId,
        assigned_at: new Date(),
        transfer_reason: null
      }, { transaction: t });
    }
    await t.commit();
    await logCaseActivity({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      user_id: user.id,
      activity_type: 'CASE_CREATED',
      activity_summary: `Case ${finalCaseNumber} created by ${user.name || 'User'}.`
    });
    if (assigned_to && assigneeName) {
      await logCaseActivity({
        organization_id: user.organization_id,
        case_id: caseRecord.id,
        user_id: user.id,
        activity_type: 'CASE_ASSIGNED',
        activity_summary: `Case ${finalCaseNumber} assigned to ${assigneeName} by ${user.name || 'Admin'}.`
      });
    }
    refreshSetupProgress(user.organization_id).catch(() => {});
    const created = await getCaseWithAccess(caseRecord.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CASE',
      entity_id: caseRecord.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : { id: caseRecord.id }
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const updateCase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    const { case_title, case_number, court_id, bench_id, judge_id, courtroom_id, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to, case_lifecycle_status, cnr_number, auto_sync_enabled } = req.body;
    const updates = {};
    if (case_title !== undefined) {
      const titleTrim = case_title.trim();
      if (!titleTrim) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Case title cannot be empty' });
      }
      if (titleTrim !== caseRecord.case_title) {
        const existingByTitle = await Case.findOne({
          where: { organization_id: user.organization_id, case_title: titleTrim, is_deleted: false, id: { [Op.ne]: caseRecord.id } }
        });
        if (existingByTitle) {
          await t.rollback();
          return res.status(409).json({ success: false, message: 'Case title already exists in this organization' });
        }
      }
      updates.case_title = titleTrim;
    }
    if (case_number !== undefined) updates.case_number = case_number.trim();
    if (court_id !== undefined) {
      updates.court_id = court_id ? (await Court.findOne({ where: { id: court_id, organization_id: user.organization_id } }) ? court_id : null) : null;
      if (court_id && !updates.court_id) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Court not found' });
      }
    }
    if (bench_id !== undefined) updates.bench_id = bench_id || null;
    if (courtroom_id !== undefined) updates.courtroom_id = courtroom_id || null;
    if (case_type !== undefined) updates.case_type = case_type;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (filing_date !== undefined) updates.filing_date = filing_date || null;
    if (next_hearing_date !== undefined) updates.next_hearing_date = next_hearing_date || null;
    if (description !== undefined) updates.description = description || null;
    if (case_lifecycle_status !== undefined) updates.case_lifecycle_status = case_lifecycle_status;
    if (cnr_number !== undefined) updates.cnr_number = (cnr_number || '').trim() || null;
    if (auto_sync_enabled !== undefined) updates.auto_sync_enabled = !!auto_sync_enabled;

    let reassignActivitySummary = null;
    if (assigned_to !== undefined && user.role === 'ORG_ADMIN') {
      const newAssigneeId = assigned_to || null;
      if (newAssigneeId !== caseRecord.assigned_to) {
        if (newAssigneeId) {
          const emp = await OrganizationUser.findOne({
            where: { id: newAssigneeId, organization_id: user.organization_id },
            attributes: ['id', 'name', 'status']
          });
          if (!emp) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Assigned employee not found' });
          }
          if (emp.status !== 'active') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Cannot assign case to inactive or left employee' });
          }
        }
        const prevName = caseRecord.Assignee ? caseRecord.Assignee.name : null;
        const newName = newAssigneeId ? (await OrganizationUser.findByPk(newAssigneeId, { attributes: ['name'], raw: true }))?.name : null;
        reassignActivitySummary = prevName && newName
          ? `Case reassigned from ${prevName} to ${newName}.`
          : newName
            ? `Case ${caseRecord.case_number} assigned to ${newName} by ${user.name || 'Admin'}.`
            : prevName
              ? `Case unassigned from ${prevName}.`
              : null;
        const currentOpen = await CaseAssignmentHistory.findOne({
          where: { case_id: caseRecord.id, unassigned_at: null },
          order: [['assigned_at', 'DESC']],
          transaction: t
        });
        if (currentOpen) {
          await currentOpen.update({ unassigned_at: new Date(), reason: newAssigneeId ? 'reassigned' : 'unassigned' }, { transaction: t });
        }
        if (newAssigneeId) {
          const now = new Date();
          await CaseAssignmentHistory.create({
            case_id: caseRecord.id,
            employee_id: newAssigneeId,
            assigned_at: now,
            assigned_by: user.id,
            reason: null
          }, { transaction: t });
          await CaseAssignmentChange.create({
            organization_id: user.organization_id,
            case_id: caseRecord.id,
            previous_assigned_to: caseRecord.assigned_to,
            new_assigned_to: newAssigneeId,
            changed_by: user.id,
            change_reason: null
          }, { transaction: t });
        }
        updates.assigned_to = newAssigneeId;
        updates.assigned_at = newAssigneeId ? new Date() : null;
        updates.assigned_by = newAssigneeId ? user.id : null;
      }
    }

    if (judge_id !== undefined) {
      const newJudgeId = judge_id || null;
      if (String(newJudgeId) !== String(caseRecord.judge_id)) {
        if (newJudgeId) {
          const judge = await Judge.findOne({
            where: { id: newJudgeId, organization_id: user.organization_id },
            attributes: ['id', 'status']
          });
          if (!judge) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Judge not found' });
          }
          if (judge.status !== 'active') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Cannot assign inactive or transferred judge' });
          }
        }
        const currentJudgeOpen = await CaseJudgeHistory.findOne({
          where: { case_id: caseRecord.id, unassigned_at: null },
          order: [['assigned_at', 'DESC']],
          transaction: t
        });
        if (currentJudgeOpen) {
          await currentJudgeOpen.update({ unassigned_at: new Date(), transfer_reason: 'reassigned' }, { transaction: t });
        }
        if (newJudgeId) {
          await CaseJudgeHistory.create({
            case_id: caseRecord.id,
            judge_id: newJudgeId,
            assigned_at: new Date(),
            transfer_reason: null
          }, { transaction: t });
        }
        updates.judge_id = newJudgeId;
      }
    }

    const oldSnapshot = caseRecord.toJSON();
    await caseRecord.update(updates, { transaction: t });
    await t.commit();
    if (reassignActivitySummary) {
      await logCaseActivity({
        organization_id: user.organization_id,
        case_id: caseRecord.id,
        user_id: user.id,
        activity_type: 'CASE_REASSIGNED',
        activity_summary: reassignActivitySummary
      });
    }
    const updated = await getCaseWithAccess(caseRecord.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CASE',
      entity_id: caseRecord.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, ...updates }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const softDeleteCase = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const oldSnapshot = caseRecord.toJSON();
    await caseRecord.update({ is_deleted: true });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CASE',
      entity_id: caseRecord.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: { is_deleted: true }
    });
    res.json({ success: true, message: 'Case deleted' });
  } catch (err) {
    next(err);
  }
};

const getCaseById = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data: caseRecord });
  } catch (err) {
    next(err);
  }
};

const getCaseHistory = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const where = { organization_id: user.organization_id, case_id: caseRecord.id };
    const activityWhere = { ...where };
    if (user.role !== 'ORG_ADMIN') {
      activityWhere.user_id = user.id;
    }
    if (req.query.user_id) activityWhere.user_id = req.query.user_id;
    if (req.query.activity_type) activityWhere.activity_type = req.query.activity_type;
    if (req.query.from_date || req.query.to_date) {
      activityWhere.created_at = {};
      if (req.query.from_date) activityWhere.created_at[Op.gte] = new Date(req.query.from_date);
      if (req.query.to_date) activityWhere.created_at[Op.lte] = new Date(req.query.to_date);
    }
    const [assignmentChanges, activityLogs] = await Promise.all([
      CaseAssignmentChange.findAll({
        where,
        include: [
          { model: OrganizationUser, as: 'PreviousAssignee', attributes: ['id', 'name'] },
          { model: OrganizationUser, as: 'NewAssignee', attributes: ['id', 'name'] },
          { model: OrganizationUser, as: 'ChangedByUser', attributes: ['id', 'name'] }
        ],
        order: [['created_at', 'DESC']]
      }),
      CaseActivityLog.findAll({
        where: activityWhere,
        include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']]
      })
    ]);
    res.json({
      success: true,
      data: {
        assignmentHistory: assignmentChanges,
        activityTimeline: activityLogs
      }
    });
  } catch (err) {
    next(err);
  }
};

function buildClientWhere(user) {
  const base = { organization_id: user.organization_id, is_deleted: false };
  if (user.role === 'ORG_ADMIN') return base;
  return { ...base, [Op.or]: [{ created_by: user.id }, { assigned_to: user.id }] };
}

const listCaseClients = async (req, res, next) => {
  try {
    const where = buildClientWhere(req.user);
    const clients = await Client.findAll({
      where,
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
};

const listCases = async (req, res, next) => {
  try {
    const user = req.user;
    let where = await buildCaseWhere(user);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();

    if (req.query.status) where.status = req.query.status;
    if (req.query.case_type) where.case_type = req.query.case_type;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.court_id) where.court_id = req.query.court_id;
    if (req.query.bench_id) where.bench_id = req.query.bench_id;
    if (req.query.judge_id) where.judge_id = req.query.judge_id;
    if (req.query.courtroom_id) where.courtroom_id = req.query.courtroom_id;

    if (search) {
      where = {
        [Op.and]: [
          where,
          {
            [Op.or]: [
              { case_title: { [Op.like]: `%${search}%` } },
              { case_number: { [Op.like]: `%${search}%` } },
              { '$Client.name$': { [Op.like]: `%${search}%` } }
            ]
          }
        ]
      };
    }

    const include = [
      { model: Client, as: 'Client', attributes: ['id', 'name'], required: !!search },
      { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name'] }
    ];

    if (req.query.cursor) {
      const cursorOpts = cursorByIdDesc(req.query.cursor);
      const cursorWhere = { [Op.and]: [where, cursorOpts.where] };
      const rows = await Case.findAll({
        where: cursorWhere,
        include,
        limit: limit + 1,
        order: cursorOpts.order,
        distinct: true
      });
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? cursorFromRow(data[data.length - 1]) : null;
      return res.json({
        success: true,
        data,
        pagination: { limit, nextCursor, hasMore }
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;
    const cacheKey = cache.cacheKey('case:list', [user.organization_id, user.id, page, limit, search, req.query.status, req.query.case_type, req.query.priority, req.query.court_id]);
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { count, rows } = await Case.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true
    });

    const payload = {
      success: true,
      data: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    };
    await cache.set(cacheKey, payload, cache.TTL.CASE_LIST);
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

const addHearing = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    const { hearing_date, courtroom, courtroom_id, judge_id, bench_id, remarks, outcome_status, outcome_notes, next_hearing_date } = req.body;
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
      case_id: caseRecord.id,
      organization_id: caseRecord.organization_id,
      created_by: user.id,
      hearing_date: hearing_date ? new Date(hearing_date) : null,
      courtroom: courtroom || null,
      courtroom_id: courtroom_id || null,
      judge_id: judgeIdForHearing,
      bench_id: bench_id || null,
      hearing_type: 'REGULAR',
      status: 'UPCOMING',
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
    await t.commit();
    const created = await CaseHearing.findByPk(hearing.id, {
      include: [
        { model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] },
        { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name'] }
      ]
    });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : hearing.toJSON()
    });
    res.status(201).json({ success: true, data: created || hearing });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const removeHearing = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const hearing = await CaseHearing.findOne({
      where: { id: req.params.hearingId, case_id: caseRecord.id }
    });
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
    res.json({ success: true, message: 'Hearing removed' });
  } catch (err) {
    next(err);
  }
};

const uploadCaseDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const { file_name, file_path } = req.body;
    const name = (file_name || '').trim() || 'Document';
    const doc = await CaseDocument.create({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      document_name: name,
      original_file_name: name,
      file_path: file_path || null,
      uploaded_by: user.id,
      document_type: 'OTHER',
      version_number: 1,
      is_deleted: false
    });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: doc.toJSON()
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

const removeCaseDocument = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const doc = await CaseDocument.findOne({
      where: { id: req.params.documentId, case_id: caseRecord.id }
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const oldSnapshot = doc.toJSON();
    await doc.destroy();
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: null
    });
    res.json({ success: true, message: 'Document removed' });
  } catch (err) {
    next(err);
  }
};

const getCasePermissions = async (req, res, next) => {
  try {
    if (req.user.role !== 'ORG_ADMIN') return res.status(403).json({ success: false, message: 'Only org admin can list case permissions' });
    const caseRecord = await Case.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id, is_deleted: false } });
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const perms = await CasePermission.findAll({
      where: { case_id: req.params.id },
      include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'] }]
    });
    res.json({ success: true, data: perms });
  } catch (err) {
    next(err);
  }
};

const setCasePermissions = async (req, res, next) => {
  try {
    if (req.user.role !== 'ORG_ADMIN') return res.status(403).json({ success: false, message: 'Only org admin can assign case permissions' });
    const caseRecord = await Case.findOne({ where: { id: req.params.id, organization_id: req.user.organization_id, is_deleted: false } });
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ success: false, message: 'permissions must be an array' });
    const valid = ['VIEW', 'EDIT', 'DELETE'];
    const userIds = [...new Set(permissions.map((p) => p.user_id))];
    const orgUsers = await OrganizationUser.findAll({ where: { id: userIds, organization_id: req.user.organization_id }, attributes: ['id'] });
    const validIds = new Set(orgUsers.map((u) => u.id));
    await CasePermission.destroy({ where: { case_id: req.params.id } });
    const toCreate = permissions.filter((p) => validIds.has(p.user_id) && valid.includes(p.permission)).map((p) => ({ case_id: req.params.id, user_id: p.user_id, permission: p.permission }));
    if (toCreate.length) await CasePermission.bulkCreate(toCreate);
    const updated = await CasePermission.findAll({ where: { case_id: req.params.id }, include: [{ model: OrganizationUser, as: 'User', attributes: ['id', 'name', 'email'] }] });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

function formatHearingDateForWhatsApp(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const sendHearingReminderWhatsApp = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });

    const now = new Date();
    const nextHearing = await CaseHearing.findOne({
      where: {
        case_id: caseRecord.id,
        is_deleted: false,
        status: 'UPCOMING',
        hearing_date: { [Op.gte]: now }
      },
      order: [['hearing_date', 'ASC']]
    });
    if (!nextHearing) {
      return res.status(400).json({ success: false, message: 'No upcoming hearing for this case' });
    }

    const caseTitle = caseRecord.case_title || 'Case';
    const hearingDateStr = formatHearingDateForWhatsApp(nextHearing.hearing_date);
    const courtroom = nextHearing.courtroom || '—';
    const params = [caseTitle, hearingDateStr, courtroom];

    let queued = false;
    if (caseRecord.Assignee?.phone) {
      queueWhatsAppMessage(caseRecord.Assignee.phone, 'hearing_reminder', params);
      queued = true;
    }
    if (caseRecord.Client?.phone) {
      queueWhatsAppMessage(caseRecord.Client.phone, 'hearing_reminder', params);
      queued = true;
    }

    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: nextHearing.id,
      action_type: 'NOTIFY',
      module_name: 'HEARINGS',
      new_value: { template: 'hearing_reminder', case_id: caseRecord.id, hearing_id: nextHearing.id },
      action_summary: `WhatsApp hearing reminder sent for hearing (${hearingDateStr}).`
    });

    res.json({ success: true, message: queued ? 'WhatsApp reminder queued for assignee and/or client.' : 'No phone numbers available; add phone for assignee or client to send.' });
  } catch (err) {
    next(err);
  }
};

const syncCaseFromECourts = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });

    const cnr = (caseRecord.cnr_number || '').trim();
    if (!cnr) {
      return res.status(400).json({ success: false, message: 'CNR number is required for eCourts sync. Add it in Edit Case.' });
    }

    const result = await fetchCaseStatusByCNR(cnr);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error || 'Failed to fetch eCourts status' });
    }

    const { status, next_hearing_date } = result.data || {};
    const oldSnapshot = {
      external_status: caseRecord.external_status,
      external_next_hearing_date: caseRecord.external_next_hearing_date,
      last_synced_at: caseRecord.last_synced_at ? caseRecord.last_synced_at.toISOString() : null
    };
    const now = new Date();
    await caseRecord.update({
      external_status: status != null ? String(status) : null,
      external_next_hearing_date: next_hearing_date || null,
      last_synced_at: now
    });

    const updated = await getCaseWithAccess(caseRecord.id, user);
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'CASE',
      entity_id: caseRecord.id,
      action_type: 'UPDATE',
      module_name: 'CASE_MANAGEMENT',
      old_value: oldSnapshot,
      new_value: { ...oldSnapshot, external_status: caseRecord.external_status, external_next_hearing_date: caseRecord.external_next_hearing_date, last_synced_at: now.toISOString() },
      action_summary: `eCourts sync: case ${caseRecord.case_number || caseRecord.id} updated from eCourts (status: ${status || '—'}, next hearing: ${next_hearing_date || '—'}).`
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/** Generate case summary using AI (or static fallback). Store in case_summary and log AI usage. */
const generateCaseSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });

    const hearingsSummary = (caseRecord.CaseHearings || [])
      .slice(0, 10)
      .map((h) => `${h.hearing_date || ''} - ${h.courtroom || ''} ${h.remarks || ''}`.trim())
      .join('; ');
    const caseContext = {
      case_title: caseRecord.case_title,
      case_number: caseRecord.case_number,
      client_name: caseRecord.Client?.name,
      description: caseRecord.description,
      hearings_summary: hearingsSummary
    };
    const summary = await aiService.generateCaseSummary(caseContext);
    if (!summary) return res.status(500).json({ success: false, message: 'Could not generate summary' });

    await caseRecord.update({ case_summary: summary });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'AI_USAGE',
      entity_id: caseRecord.id,
      action_type: 'CASE_SUMMARY',
      action_summary: `Case summary generated for case ${caseRecord.case_number || caseRecord.id}`,
      entity_label: caseRecord.case_title,
      module_name: 'AI'
    });

    const updated = await getCaseWithAccess(caseRecord.id, user);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCaseClients,
  createCase,
  updateCase,
  softDeleteCase,
  getCaseById,
  getCaseHistory,
  listCases,
  addHearing,
  removeHearing,
  uploadCaseDocument,
  removeCaseDocument,
  getCasePermissions,
  setCasePermissions,
  syncCaseFromECourts,
  sendHearingReminderWhatsApp,
  generateCaseSummary
};
