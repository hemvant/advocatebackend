const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { documentUploadValidation, documentUpdateMetadataValidation } = require('../utils/validators');
const { uploadDocument: multerUpload, uploadNewVersion: multerNewVersion } = require('../config/uploads');
const documentController = require('../controllers/documentController');
const { checkDocumentPermission } = require('../middleware/acl');

const router = express.Router();

router.get('/', documentController.listDocuments);
router.get('/search', documentController.searchDocuments);
router.get('/dashboard', documentController.getDocumentDashboard);
router.post(
  '/',
  multerUpload.single('file'),
  sanitizeBody,
  documentUploadValidation,
  validate,
  documentController.uploadDocument
);
router.get('/:id/versions', checkDocumentPermission('VIEW'), documentController.getDocumentVersions);
router.get('/:id/versions/:versionId/download', checkDocumentPermission('VIEW'), documentController.downloadVersion);
router.post('/:id/restore/:versionId', checkDocumentPermission('EDIT'), documentController.restoreDocumentVersion);
router.get('/:id', checkDocumentPermission('VIEW'), documentController.getDocumentById);
router.get('/:id/download', checkDocumentPermission('VIEW'), documentController.downloadDocument);
router.put('/:id', checkDocumentPermission('EDIT'), sanitizeBody, documentUpdateMetadataValidation, validate, documentController.updateDocumentMetadata);
router.delete('/:id', checkDocumentPermission('DELETE'), documentController.softDeleteDocument);
router.post(
  '/:id/version',
  checkDocumentPermission('EDIT'),
  multerNewVersion.single('file'),
  documentController.uploadNewVersion
);

module.exports = router;
