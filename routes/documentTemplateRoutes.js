const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const documentTemplateController = require('../controllers/documentTemplateController');
const { body } = require('express-validator');

const templateValidation = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 255 }),
  body('template_type').optional().trim().isLength({ max: 50 }),
  body('content').optional(),
  body('variables').optional().isArray(),
  body('is_active').optional().isBoolean()
];
const generatePdfValidation = [body('case_id').isInt({ min: 1 }).withMessage('case_id is required')];

const router = express.Router();

router.get('/', documentTemplateController.listTemplates);
router.get('/:id', documentTemplateController.getTemplate);
router.post('/', sanitizeBody, templateValidation, validate, documentTemplateController.createTemplate);
router.put('/:id', sanitizeBody, templateValidation, validate, documentTemplateController.updateTemplate);
router.delete('/:id', documentTemplateController.deleteTemplate);
router.post('/:id/generate-pdf', sanitizeBody, generatePdfValidation, validate, documentTemplateController.generatePdf);

module.exports = router;
