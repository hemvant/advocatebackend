const { sequelize, Case, CaseHearing, CaseDocument, Client, OrganizationUser, Court, CourtType, CourtBench, Judge, Courtroom, CasePermission } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../utils/auditService');
const cache = require('../utils/cache');
const { cursorByIdDesc, cursorFromRow } = require('../utils/pagination');

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
      { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
      { model: Court, as: 'Court', attributes: ['id', 'name'], include: [{ model: CourtType, as: 'CourtType', attributes: ['id', 'name'] }] },
      { model: CourtBench, as: 'Bench', attributes: ['id', 'name'] },
      { model: Judge, as: 'Judge', attributes: ['id', 'name', 'designation'] },
      { model: Courtroom, as: 'Courtroom', attributes: ['id', 'room_number', 'floor'] },
      { model: CaseHearing, as: 'CaseHearings' },
      { model: CaseDocument, as: 'CaseDocuments', include: [{ model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }] }
    ],
  });
  if (caseRecord && caseRecord.CaseHearings && caseRecord.CaseHearings.length) {
    caseRecord.CaseHearings.sort((a, b) => (a.hearing_date || '').localeCompare(b.hearing_date || ''));
  }
  return caseRecord;
}

const createCase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const { client_id, case_title, case_number, court_id, bench_id, judge_id, courtroom_id, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to } = req.body;

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

    const caseRecord = await Case.create({
      organization_id: user.organization_id,
      client_id,
      created_by: user.id,
      assigned_to: assigned_to || null,
      case_title: case_title.trim(),
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
    await t.commit();
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
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const { case_title, case_number, court_id, bench_id, judge_id, courtroom_id, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to } = req.body;
    const updates = {};
    if (case_title !== undefined) updates.case_title = case_title.trim();
    if (case_number !== undefined) updates.case_number = case_number.trim();
    if (court_id !== undefined) {
      updates.court_id = court_id ? (await Court.findOne({ where: { id: court_id, organization_id: user.organization_id } }) ? court_id : null) : null;
      if (court_id && !updates.court_id) return res.status(400).json({ success: false, message: 'Court not found' });
    }
    if (bench_id !== undefined) updates.bench_id = bench_id || null;
    if (judge_id !== undefined) updates.judge_id = judge_id || null;
    if (courtroom_id !== undefined) updates.courtroom_id = courtroom_id || null;
    if (case_type !== undefined) updates.case_type = case_type;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (filing_date !== undefined) updates.filing_date = filing_date || null;
    if (next_hearing_date !== undefined) updates.next_hearing_date = next_hearing_date || null;
    if (description !== undefined) updates.description = description || null;
    if (assigned_to !== undefined && user.role === 'ORG_ADMIN') updates.assigned_to = assigned_to || null;
    const oldSnapshot = caseRecord.toJSON();
    await caseRecord.update(updates);
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
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const { hearing_date, courtroom, courtroom_id, judge_id, bench_id, remarks } = req.body;
    const hearing = await CaseHearing.create({
      case_id: caseRecord.id,
      organization_id: caseRecord.organization_id,
      created_by: user.id,
      hearing_date: hearing_date ? new Date(hearing_date) : null,
      courtroom: courtroom || null,
      courtroom_id: courtroom_id || null,
      judge_id: judge_id || null,
      bench_id: bench_id || null,
      hearing_type: 'REGULAR',
      status: 'UPCOMING',
      remarks: remarks || null,
      reminder_sent: false
    });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: hearing.toJSON()
    });
    res.status(201).json({ success: true, data: hearing });
  } catch (err) {
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
    await hearing.destroy();
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'HEARING',
      entity_id: hearing.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: null
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

module.exports = {
  listCaseClients,
  createCase,
  updateCase,
  softDeleteCase,
  getCaseById,
  listCases,
  addHearing,
  removeHearing,
  uploadCaseDocument,
  removeCaseDocument,
  getCasePermissions,
  setCasePermissions
};
