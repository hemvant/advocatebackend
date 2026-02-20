const path = require('path');
const fs = require('fs');
const {
  sequelize,
  CaseDocument,
  DocumentVersion,
  Case,
  Client,
  OrganizationUser,
  DocumentPermission
} = require('../models');
const { Op } = require('sequelize');
const { UPLOAD_BASE } = require('../config/uploads');
const auditService = require('../utils/auditService');

async function buildDocumentWhere(user, extra = {}) {
  const base = {
    organization_id: user.organization_id,
    is_deleted: false,
    ...extra
  };
  if (user.role === 'ORG_ADMIN') return { where: base, includeCase: false };
  const aclRows = await DocumentPermission.findAll({
    where: { user_id: user.id },
    attributes: ['document_id']
  });
  const aclDocIds = aclRows.length ? aclRows.map((r) => r.document_id) : [];
  const orConditions = [{ '$Case.assigned_to$': user.id }, { uploaded_by: user.id }];
  if (aclDocIds.length) orConditions.push({ id: { [Op.in]: aclDocIds } });
  return {
    where: { ...base, [Op.or]: orConditions },
    includeCase: true
  };
}

async function getDocumentWithAccess(documentId, user) {
  const opts = await buildDocumentWhere(user, { id: documentId });
  const include = [
    { model: Case, as: 'Case', required: opts.includeCase, attributes: ['id', 'case_title', 'case_number', 'client_id', 'assigned_to'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name', 'email'] }] },
    { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name', 'email'] }
  ];
  const doc = await CaseDocument.findOne({
    where: opts.where,
    include: opts.includeCase ? [{ model: Case, as: 'Case', required: true, attributes: [] }, ...include] : include
  });
  return doc;
}

async function uploadDocument(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { case_id, document_name, document_type } = req.body;
    const caseRecord = await Case.findOne({
      where: { id: case_id, organization_id: user.organization_id, is_deleted: false }
    });
    if (!caseRecord) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    const relativePath = path.relative(UPLOAD_BASE, file.path);
    const doc = await CaseDocument.create({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      uploaded_by: user.id,
      document_name: (document_name || file.originalname || 'Document').trim().slice(0, 255),
      original_file_name: (file.originalname || '').slice(0, 255),
      file_path: relativePath,
      file_size: file.size,
      mime_type: file.mimetype,
      document_type: document_type || 'OTHER',
      version_number: 1,
      is_deleted: false
    }, { transaction: t });
    await t.commit();
    const created = await CaseDocument.findByPk(doc.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
        { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }
      ]
    });
    await auditService.log(req, {
      organization_id: user.organization_id,
      user_id: user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'CREATE',
      old_value: null,
      new_value: created ? created.toJSON() : doc.toJSON()
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const user = req.user;
    const { case_id, document_type, from_date, to_date, page = 1, limit = 20, search } = req.query;
    const opts = await buildDocumentWhere(user);
    const where = { ...opts.where };
    if (case_id) where.case_id = case_id;
    if (document_type) where.document_type = document_type;
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = from_date;
      if (to_date) where.created_at[Op.lte] = to_date;
    }
    if (search && search.trim()) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { document_name: { [Op.like]: `%${search.trim()}%` } },
          { original_file_name: { [Op.like]: `%${search.trim()}%` } }
        ]
      });
    }
    const include = [
      { model: Case, as: 'Case', required: opts.includeCase, attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
      { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }
    ];
    const query = {
      where,
      include,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      offset: (Math.max(1, parseInt(page, 10)) - 1) * (Math.min(parseInt(limit, 10) || 20, 100)),
      order: [['created_at', 'DESC']]
    };
    const { count, rows } = await CaseDocument.findAndCountAll(query);
    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10) || 1, limit: query.limit });
  } catch (err) {
    next(err);
  }
}

async function getDocumentById(req, res, next) {
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const versions = await DocumentVersion.findAll({
      where: { document_id: doc.id },
      order: [['version_number', 'DESC']],
      include: [{ model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: { ...doc.toJSON(), DocumentVersions: versions } });
  } catch (err) {
    next(err);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const absolutePath = path.join(UPLOAD_BASE, doc.file_path);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ success: false, message: 'File not found on disk' });
    const name = doc.original_file_name || doc.document_name || 'document';
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/"/g, '%22')}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.sendFile(absolutePath);
  } catch (err) {
    next(err);
  }
}

async function updateDocumentMetadata(req, res, next) {
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const { document_name, document_type } = req.body;
    if (document_name !== undefined) doc.document_name = document_name.trim().slice(0, 255);
    if (document_type !== undefined) doc.document_type = document_type;
    const oldSnapshot = doc.toJSON();
    await doc.save();
    const updated = await CaseDocument.findByPk(doc.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
        { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }
      ]
    });
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'UPDATE',
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, document_name: doc.document_name, document_type: doc.document_type }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function softDeleteDocument(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const oldSnapshot = doc.toJSON();
    doc.is_deleted = true;
    await doc.save({ transaction: t });
    await t.commit();
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'DELETE',
      old_value: oldSnapshot,
      new_value: { is_deleted: true }
    });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

async function uploadNewVersion(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const user = req.user;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const doc = req.document || (await getDocumentWithAccess(req.params.id, user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const previousPath = path.join(UPLOAD_BASE, doc.file_path);
    await DocumentVersion.create({
      document_id: doc.id,
      version_number: doc.version_number,
      file_path: doc.file_path,
      uploaded_by: doc.uploaded_by
    }, { transaction: t });
    const relativePath = path.relative(UPLOAD_BASE, file.path);
    doc.version_number += 1;
    doc.file_path = relativePath;
    doc.file_size = file.size;
    doc.mime_type = file.mimetype;
    doc.original_file_name = (file.originalname || doc.original_file_name || '').slice(0, 255);
    doc.uploaded_by = user.id;
    await doc.save({ transaction: t });
    await t.commit();
    const updated = await CaseDocument.findByPk(doc.id, {
      include: [
        { model: Case, as: 'Case', attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
        { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }
      ]
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentById,
  downloadDocument,
  updateDocumentMetadata,
  softDeleteDocument,
  uploadNewVersion
};
