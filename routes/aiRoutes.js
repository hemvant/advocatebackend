const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const aiController = require('../controllers/aiController');

const router = express.Router();

router.get('/templates', aiController.getTemplates);
router.post('/draft', sanitizeBody, aiController.generateDraft);

module.exports = router;
