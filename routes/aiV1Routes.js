'use strict';

const express = require('express');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const organizationAuth = require('../middleware/organizationAuth');
const { aiRateLimitMiddleware } = require('../middleware/aiRateLimit');
const aiV1Controller = require('../controllers/aiV1Controller');

const router = express.Router();

router.use(organizationAuth);
router.use(aiRateLimitMiddleware);

router.get('/usage', aiV1Controller.usage);
router.get('/allowed-features', aiV1Controller.allowedFeatures);
router.get('/prompt-templates', aiV1Controller.promptTemplatesList);

router.post('/case-summary', sanitizeBody, aiV1Controller.caseSummary);
router.post('/draft', sanitizeBody, aiV1Controller.draft);
router.post('/judgment-summary', sanitizeBody, aiV1Controller.judgmentSummary);
router.post('/cross-exam', sanitizeBody, aiV1Controller.crossExam);
router.post('/fir-analysis', sanitizeBody, aiV1Controller.firAnalysis);
router.post('/legal-research', sanitizeBody, aiV1Controller.legalResearch);

router.post('/chat/start', sanitizeBody, aiV1Controller.chatStart);
router.post('/chat/message', sanitizeBody, aiV1Controller.chatMessage);
router.get('/chat/history', aiV1Controller.chatHistory);
router.get('/chat/sessions', aiV1Controller.chatSessions);
router.put('/chat/sessions/:id', sanitizeBody, aiV1Controller.chatSessionUpdate);
router.delete('/chat/sessions/:id', aiV1Controller.chatSessionDelete);

module.exports = router;
