const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const {
  createCaseValidation,
  updateCaseValidation,
  addHearingValidation,
  uploadDocumentValidation
} = require('../utils/validators');
const caseController = require('../controllers/caseController');

const router = express.Router();

router.get('/clients', caseController.listCaseClients);
router.get('/', caseController.listCases);
router.post('/', sanitizeBody, createCaseValidation, validate, caseController.createCase);
router.get('/:id', caseController.getCaseById);
router.put('/:id', sanitizeBody, updateCaseValidation, validate, caseController.updateCase);
router.delete('/:id', caseController.softDeleteCase);
router.post('/:id/hearings', sanitizeBody, addHearingValidation, validate, caseController.addHearing);
router.delete('/:id/hearings/:hearingId', caseController.removeHearing);
router.post('/:id/documents', sanitizeBody, uploadDocumentValidation, validate, caseController.uploadCaseDocument);
router.delete('/:id/documents/:documentId', caseController.removeCaseDocument);

module.exports = router;
