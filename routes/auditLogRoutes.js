const express = require('express');
const auditLogController = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', auditLogController.listAuditLogs);

module.exports = router;
