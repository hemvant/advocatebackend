const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { documentUploadValidation, documentUpdateMetadataValidation } = require('../utils/validators');
const { uploadDocument: multerUpload, uploadNewVersion: multerNewVersion } = require('../config/uploads');
const documentController = require('../controllers/documentController');
const { CaseDocument, Case } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

function buildDocumentWhere(user, extra = {}) {
  const base = { organization_id: user.organization_id, is_deleted: false, ...extra };
  if (user.role === 'ORG_ADMIN') return { where: base, includeCase: false };
  return {
    where: { ...base, [Op.or]: [{ '$Case.assigned_to$': user.id }, { uploaded_by: user.id }] },
    includeCase: true
  };
}

async function loadDocumentForVersion(req, res, next) {
  try {
    const opts = buildDocumentWhere(req.user, { id: req.params.id });
    const doc = await CaseDocument.findOne({
      where: opts.where,
      include: opts.includeCase ? [{ model: Case, as: 'Case', required: true, attributes: [] }] : []
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    req.document = doc;
    req.body.case_id = doc.case_id;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', documentController.listDocuments);
router.post(
  '/',
  multerUpload.single('file'),
  sanitizeBody,
  documentUploadValidation,
  validate,
  documentController.uploadDocument
);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download', documentController.downloadDocument);
router.put('/:id', sanitizeBody, documentUpdateMetadataValidation, validate, documentController.updateDocumentMetadata);
router.delete('/:id', documentController.softDeleteDocument);
router.post(
  '/:id/version',
  loadDocumentForVersion,
  multerNewVersion.single('file'),
  documentController.uploadNewVersion
);

module.exports = router;
