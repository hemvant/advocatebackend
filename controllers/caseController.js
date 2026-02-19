const { sequelize, Case, CaseHearing, CaseDocument, Client, OrganizationUser } = require('../models');
const { Op } = require('sequelize');

function buildCaseWhere(user) {
  const base = { organization_id: user.organization_id, is_deleted: false };
  if (user.role === 'ORG_ADMIN') return base;
  return { ...base, [Op.or]: [{ created_by: user.id }, { assigned_to: user.id }] };
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
  const where = buildCaseWhere(user);
  const caseRecord = await Case.findOne({
    where: { id: caseId, ...where },
    include: [
      { model: Client, as: 'Client', attributes: ['id', 'name', 'email', 'phone'] },
      { model: OrganizationUser, as: 'Creator', attributes: ['id', 'name', 'email'] },
      { model: OrganizationUser, as: 'Assignee', attributes: ['id', 'name', 'email'] },
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
    const { client_id, case_title, case_number, court_name, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to } = req.body;

    const client = await Client.findOne({
      where: { id: client_id, organization_id: user.organization_id, is_deleted: false }
    });
    if (!client) return res.status(400).json({ success: false, message: 'Client not found or does not belong to your organization' });

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
      court_name: court_name || null,
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
    const { case_title, case_number, court_name, case_type, status, priority, filing_date, next_hearing_date, description, assigned_to } = req.body;
    const updates = {};
    if (case_title !== undefined) updates.case_title = case_title.trim();
    if (case_number !== undefined) updates.case_number = case_number.trim();
    if (court_name !== undefined) updates.court_name = court_name || null;
    if (case_type !== undefined) updates.case_type = case_type;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (filing_date !== undefined) updates.filing_date = filing_date || null;
    if (next_hearing_date !== undefined) updates.next_hearing_date = next_hearing_date || null;
    if (description !== undefined) updates.description = description || null;
    if (assigned_to !== undefined && user.role === 'ORG_ADMIN') updates.assigned_to = assigned_to || null;
    await caseRecord.update(updates);
    const updated = await getCaseWithAccess(caseRecord.id, user);
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
    await caseRecord.update({ is_deleted: true });
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
    const where = buildCaseWhere(user);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    if (req.query.status) where.status = req.query.status;
    if (req.query.case_type) where.case_type = req.query.case_type;
    if (req.query.priority) where.priority = req.query.priority;

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

    const { count, rows } = await Case.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [['created_at', 'DESC']],
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

const addHearing = async (req, res, next) => {
  try {
    const user = req.user;
    const caseRecord = await getCaseWithAccess(req.params.id, user);
    if (!caseRecord) return res.status(404).json({ success: false, message: 'Case not found' });
    const { hearing_date, courtroom, remarks } = req.body;
    const hearing = await CaseHearing.create({
      case_id: caseRecord.id,
      organization_id: caseRecord.organization_id,
      created_by: user.id,
      hearing_date: hearing_date ? new Date(hearing_date) : null,
      courtroom: courtroom || null,
      hearing_type: 'REGULAR',
      status: 'UPCOMING',
      remarks: remarks || null,
      reminder_sent: false
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
    await hearing.destroy();
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
    await doc.destroy();
    res.json({ success: true, message: 'Document removed' });
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
  removeCaseDocument
};
