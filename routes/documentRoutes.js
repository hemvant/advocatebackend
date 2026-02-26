const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { documentUploadValidation, documentBulkUploadValidation, documentUpdateMetadataValidation } = require('../utils/validators');
const { uploadDocument: multerUpload, uploadNewVersion: multerNewVersion } = require('../config/uploads');
const documentController = require('../controllers/documentController');
const { checkDocumentPermission } = require('../middleware/acl');

const router = express.Router();

router.get('/', documentController.listDocuments);
router.get('/search', documentController.searchDocuments);
router.get('/dashboard', documentController.getDocumentDashboard);
router.get('/download', documentController.downloadWithToken);
router.post(
  '/',
  multerUpload.single('file'),
  sanitizeBody,
  documentUploadValidation,
  validate,
  documentController.uploadDocument
);
router.post(
  '/bulk',
  multerUpload.array('files', 20),
  sanitizeBody,
  documentBulkUploadValidation,
  validate,
  documentController.bulkUploadDocuments
);
router.get('/:id/signed-url', checkDocumentPermission('VIEW'), documentController.getSignedDownloadUrl);
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
