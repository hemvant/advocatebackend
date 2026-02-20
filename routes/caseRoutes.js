const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const {
  createCaseValidation,
  updateCaseValidation,
  addHearingValidation,
  uploadDocumentValidation,
  assignJudgeToCaseValidation,
  setCasePermissionsValidation
} = require('../utils/validators');
const caseController = require('../controllers/caseController');
const judgeController = require('../controllers/judgeController');
const taskController = require('../controllers/taskController');
const { checkCasePermission } = require('../middleware/acl');

const router = express.Router();

router.get('/clients', caseController.listCaseClients);
router.get('/', caseController.listCases);
router.post('/', sanitizeBody, createCaseValidation, validate, caseController.createCase);
router.get('/:caseId/tasks', taskController.listTasksByCase);
router.get('/:id/permissions', caseController.getCasePermissions);
router.put('/:id/permissions', sanitizeBody, setCasePermissionsValidation, validate, caseController.setCasePermissions);
router.get('/:id', caseController.getCaseById);
router.put('/:caseId/judge', sanitizeBody, assignJudgeToCaseValidation, validate, judgeController.assignJudgeToCase);
router.put('/:id', checkCasePermission('EDIT'), sanitizeBody, updateCaseValidation, validate, caseController.updateCase);
router.delete('/:id', checkCasePermission('DELETE'), caseController.softDeleteCase);
router.post('/:id/hearings', sanitizeBody, addHearingValidation, validate, caseController.addHearing);
router.delete('/:id/hearings/:hearingId', caseController.removeHearing);
router.post('/:id/documents', sanitizeBody, uploadDocumentValidation, validate, caseController.uploadCaseDocument);
router.delete('/:id/documents/:documentId', caseController.removeCaseDocument);

module.exports = router;
