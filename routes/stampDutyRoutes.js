const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { stampDutyConfigValidation, stampDutyCalculateValidation } = require('../utils/validators');
const stampDutyController = require('../controllers/stampDutyController');

const router = express.Router();

router.get('/', stampDutyController.listConfig);
router.post('/calculate', sanitizeBody, stampDutyCalculateValidation, validate, stampDutyController.calculate);
router.post('/', sanitizeBody, stampDutyConfigValidation, validate, stampDutyController.createConfig);
router.put('/:id', sanitizeBody, stampDutyConfigValidation, validate, stampDutyController.updateConfig);

module.exports = router;
