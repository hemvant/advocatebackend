const express = require('express');
const superAdminRoutes = require('./superAdminRoutes');
const orgRoutes = require('./orgRoutes');
const clientRoutes = require('./clientRoutes');
const caseRoutes = require('./caseRoutes');
const hearingRoutes = require('./hearingRoutes');
const documentRoutes = require('./documentRoutes');
const courtRoutes = require('./courtRoutes');
const judgeRoutes = require('./judgeRoutes');
const benchRoutes = require('./benchRoutes');
const courtroomRoutes = require('./courtroomRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const taskRoutes = require('./taskRoutes');
const billingRoutes = require('./billingRoutes');
const organizationAuth = require('../middleware/organizationAuth');
const { moduleAccessMiddleware } = require('../middleware/moduleAccess');

const router = express.Router();

router.use('/super-admin', superAdminRoutes);
router.use('/org', orgRoutes);
router.use('/clients', organizationAuth, moduleAccessMiddleware('Client Management'), clientRoutes);
router.use('/cases', organizationAuth, moduleAccessMiddleware('Case Management'), caseRoutes);
router.use('/hearings', organizationAuth, moduleAccessMiddleware('Case Management'), hearingRoutes);
router.use('/documents', organizationAuth, moduleAccessMiddleware('Document Management'), documentRoutes);
router.use('/courts', organizationAuth, moduleAccessMiddleware('Case Management'), courtRoutes);
router.use('/judges', organizationAuth, moduleAccessMiddleware('Case Management'), judgeRoutes);
router.use('/benches', organizationAuth, moduleAccessMiddleware('Case Management'), benchRoutes);
router.use('/courtrooms', organizationAuth, moduleAccessMiddleware('Case Management'), courtroomRoutes);
router.use('/audit-logs', organizationAuth, moduleAccessMiddleware('Reports'), auditLogRoutes);
router.use('/analytics', organizationAuth, moduleAccessMiddleware('Reports'), analyticsRoutes);
router.use('/tasks', organizationAuth, moduleAccessMiddleware('Case Management'), taskRoutes);
router.use('/billing', organizationAuth, moduleAccessMiddleware('Billing'), billingRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

module.exports = router;
