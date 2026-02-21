const express = require('express');
const auditLogController = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', auditLogController.listAuditLogs);
router.get('/export', auditLogController.exportAuditLogs);

module.exports = router;
