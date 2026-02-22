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
const { UPLOAD_BASE, writeUploadToDisk } = require('../config/uploads');
const auditService = require('../utils/auditService');
const ocrQueue = require('../utils/ocrQueue');

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
    const relativePath = writeUploadToDisk(file, user.organization_id, caseRecord.id);
    const docName = (document_name || file.originalname || 'Document').trim().slice(0, 255);
    const originalName = (file.originalname || '').slice(0, 255);
    const doc = await CaseDocument.create({
      organization_id: user.organization_id,
      case_id: caseRecord.id,
      uploaded_by: user.id,
      document_name: docName,
      original_file_name: originalName,
      file_path: relativePath,
      file_size: file.size,
      mime_type: file.mimetype,
      document_type: document_type || 'OTHER',
      version_number: 1,
      current_version: 1,
      is_deleted: false,
      ocr_status: 'PENDING'
    }, { transaction: t });
    await DocumentVersion.create({
      document_id: doc.id,
      organization_id: user.organization_id,
      version_number: 1,
      file_path: relativePath,
      file_name: originalName || docName,
      file_size: file.size,
      mime_type: file.mimetype,
      change_type: 'CREATED',
      changed_by: user.id,
      change_summary: 'Document created'
    }, { transaction: t });
    await t.commit();
    setImmediate(() => ocrQueue.triggerOcr(doc.id));
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
      entity_label: doc.document_name || doc.original_file_name || 'Document',
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
      where: { document_id: doc.id, organization_id: req.user.organization_id },
      order: [['version_number', 'DESC']],
      limit: 10,
      include: [
        { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Changer', attributes: ['id', 'name'] }
      ]
    });
    res.json({ success: true, data: { ...doc.toJSON(), DocumentVersions: versions } });
  } catch (err) {
    next(err);
  }
}

async function getDocumentVersions(req, res, next) {
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const { count, rows } = await DocumentVersion.findAndCountAll({
      where: { document_id: doc.id, organization_id: req.user.organization_id },
      order: [['version_number', 'DESC']],
      limit: limitNum,
      offset,
      include: [
        { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] },
        { model: OrganizationUser, as: 'Changer', attributes: ['id', 'name'] }
      ]
    });
    res.json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page, 10) || 1,
      limit: limitNum,
      current_version: doc.current_version ?? doc.version_number
    });
  } catch (err) {
    next(err);
  }
}

async function downloadVersion(req, res, next) {
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const { versionId } = req.params;
    const version = await DocumentVersion.findOne({
      where: { id: versionId, document_id: doc.id, organization_id: req.user.organization_id }
    });
    if (!version || !version.file_path) return res.status(404).json({ success: false, message: 'Version not found' });
    const absolutePath = path.join(UPLOAD_BASE, version.file_path);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ success: false, message: 'File not found on disk' });
    const name = version.file_name || doc.original_file_name || `document-v${version.version_number}`;
    res.setHeader('Content-Disposition', `attachment; filename="${String(name).replace(/"/g, '%22')}"`);
    res.setHeader('Content-Type', version.mime_type || 'application/octet-stream');
    res.sendFile(absolutePath);
  } catch (err) {
    next(err);
  }
}

async function restoreDocumentVersion(req, res, next) {
  if (req.user.role !== 'ORG_ADMIN') {
    return res.status(403).json({ success: false, message: 'Only organization admins can restore versions' });
  }
  const t = await sequelize.transaction();
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    const { versionId } = req.params;
    const version = await DocumentVersion.findOne({
      where: { id: versionId, document_id: doc.id, organization_id: doc.organization_id }
    });
    if (!version) return res.status(404).json({ success: false, message: 'Version not found' });
    if (!version.file_path) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot restore: version has no file' });
    }
    const absolutePath = path.join(UPLOAD_BASE, version.file_path);
    if (!fs.existsSync(absolutePath)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Version file no longer exists on disk' });
    }
    const newVersionNum = (doc.version_number || 0) + 1;
    await DocumentVersion.create({
      document_id: doc.id,
      organization_id: doc.organization_id,
      version_number: newVersionNum,
      file_path: version.file_path,
      file_name: version.file_name || doc.original_file_name,
      file_size: version.file_size,
      mime_type: version.mime_type,
      ocr_text: version.ocr_text,
      change_type: 'UPDATED_FILE',
      changed_by: req.user.id,
      change_summary: `Restored from version ${version.version_number}`
    }, { transaction: t });
    doc.version_number = newVersionNum;
    doc.current_version = newVersionNum;
    doc.file_path = version.file_path;
    doc.file_size = version.file_size;
    doc.mime_type = version.mime_type;
    doc.original_file_name = version.file_name || doc.original_file_name;
    doc.ocr_text = version.ocr_text;
    doc.ocr_status = version.ocr_text ? 'COMPLETED' : 'PENDING';
    doc.uploaded_by = req.user.id;
    await doc.save({ transaction: t });
    await t.commit();
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
      action_type: 'RESTORE',
      entity_label: doc.document_name || doc.original_file_name,
      action_summary: `Document restored to version ${version.version_number} by ${req.user.name || 'Admin'} (${req.user.role}).`,
      old_value: { version_number: doc.version_number - 1 },
      new_value: { version_number: newVersionNum, restored_from_version: version.version_number }
    });
    res.json({ success: true, data: updated, message: `Restored to version ${version.version_number}` });
  } catch (err) {
    await t.rollback();
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
    await auditService.log(req, {
      organization_id: req.user.organization_id,
      user_id: req.user.id,
      entity_type: 'DOCUMENT',
      entity_id: doc.id,
      action_type: 'DOWNLOAD',
      entity_label: name
    });
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
    const oldName = doc.document_name;
    const oldType = doc.document_type;
    if (document_name !== undefined) doc.document_name = document_name.trim().slice(0, 255);
    if (document_type !== undefined) doc.document_type = document_type;
    const parts = [];
    if (oldName !== doc.document_name) parts.push(`File name changed from "${oldName}" to "${doc.document_name}"`);
    if (oldType !== doc.document_type) parts.push(`Type changed from ${oldType} to ${doc.document_type}`);
    const change_summary = parts.length ? parts.join('; ') : 'Metadata updated';
    await DocumentVersion.create({
      document_id: doc.id,
      organization_id: doc.organization_id,
      version_number: doc.version_number,
      file_path: doc.file_path,
      file_name: doc.original_file_name || doc.document_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      ocr_text: doc.ocr_text,
      change_type: 'UPDATED_METADATA',
      changed_by: req.user.id,
      change_summary
    });
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
      entity_label: doc.document_name || doc.original_file_name,
      old_value: oldSnapshot,
      new_value: updated ? updated.toJSON() : { ...oldSnapshot, document_name: doc.document_name, document_type: doc.document_type }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function searchDocuments(req, res, next) {
  try {
    const user = req.user;
    const { q, case_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const opts = await buildDocumentWhere(user);
    const where = { ...opts.where };
    if (case_id) where.case_id = case_id;
    if (from_date || to_date) {
      where.created_at = where.created_at || {};
      if (from_date) where.created_at[Op.gte] = from_date;
      if (to_date) where.created_at[Op.lte] = to_date;
    }
    const hasQuery = q && String(q).trim().length > 0;
    if (hasQuery) {
      where.ocr_text = { [Op.ne]: null };
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push(sequelize.literal(`MATCH(ocr_text) AGAINST(${sequelize.escape(String(q).trim())} IN NATURAL LANGUAGE MODE)`));
    }
    const include = [
      { model: Case, as: 'Case', required: opts.includeCase, attributes: ['id', 'case_title', 'case_number'], include: [{ model: Client, as: 'Client', attributes: ['id', 'name'] }] },
      { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }
    ];
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * limitNum;
    const attributes = ['id', 'document_name', 'case_id', 'ocr_status', 'created_at', [sequelize.literal("SUBSTRING(COALESCE(ocr_text,''), 1, 200)"), 'snippet']];
    const { count, rows } = await CaseDocument.findAndCountAll({
      where,
      include: opts.includeCase ? [{ model: Case, as: 'Case', required: true, attributes: [] }, ...include] : include,
      attributes,
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']]
    });
    const data = rows.map((r) => {
      const j = r.toJSON();
      return { id: j.id, file_name: j.document_name, case_id: j.case_id, snippet: j.snippet || null, created_at: j.created_at, ocr_status: j.ocr_status };
    });
    res.json({ success: true, data, total: count, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

async function getDocumentDashboard(req, res, next) {
  try {
    const user = req.user;
    const opts = await buildDocumentWhere(user);
    const where = { ...opts.where };
    const include = opts.includeCase ? [{ model: Case, as: 'Case', required: true, attributes: [] }] : [];
    const total = await CaseDocument.count({ where, include });
    const processed = await CaseDocument.count({ where: { ...where, ocr_status: 'COMPLETED' }, include });
    const pending = await CaseDocument.count({ where: { ...where, ocr_status: { [Op.in]: ['PENDING', 'PROCESSING'] } }, include });
    const recent = await CaseDocument.findAll({
      where,
      include: [...include, { model: Case, as: 'Case', required: opts.includeCase, attributes: ['id', 'case_title', 'case_number'] }, { model: OrganizationUser, as: 'Uploader', attributes: ['id', 'name'] }],
      attributes: ['id', 'document_name', 'case_id', 'ocr_status', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    res.json({
      success: true,
      data: { total, processed, pending, recent: recent.map((r) => r.toJSON()) }
    });
  } catch (err) {
    next(err);
  }
}

async function softDeleteDocument(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const doc = req.document || (await getDocumentWithAccess(req.params.id, req.user));
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    await DocumentVersion.create({
      document_id: doc.id,
      organization_id: doc.organization_id,
      version_number: doc.version_number,
      file_path: doc.file_path,
      file_name: doc.original_file_name || doc.document_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      ocr_text: doc.ocr_text,
      change_type: 'DELETED',
      changed_by: req.user.id,
      change_summary: 'Document deleted'
    }, { transaction: t });
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
      entity_label: doc.document_name || doc.original_file_name,
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
    await DocumentVersion.create({
      document_id: doc.id,
      organization_id: doc.organization_id,
      version_number: doc.version_number,
      file_path: doc.file_path,
      file_name: doc.original_file_name || doc.document_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      ocr_text: doc.ocr_text,
      change_type: 'UPDATED_FILE',
      changed_by: user.id,
      change_summary: 'New file uploaded'
    }, { transaction: t });
    const relativePath = writeUploadToDisk(file, doc.organization_id, doc.case_id);
    doc.version_number += 1;
    doc.current_version = doc.version_number;
    doc.file_path = relativePath;
    doc.file_size = file.size;
    doc.mime_type = file.mimetype;
    doc.original_file_name = (file.originalname || doc.original_file_name || '').slice(0, 255);
    doc.uploaded_by = user.id;
    doc.ocr_text = null;
    doc.ocr_status = 'PENDING';
    await doc.save({ transaction: t });
    await t.commit();
    setImmediate(() => ocrQueue.triggerOcr(doc.id));
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
  searchDocuments,
  getDocumentDashboard,
  getDocumentById,
  getDocumentVersions,
  downloadVersion,
  restoreDocumentVersion,
  downloadDocument,
  updateDocumentMetadata,
  softDeleteDocument,
  uploadNewVersion
};
