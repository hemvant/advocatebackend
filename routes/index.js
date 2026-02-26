const express = require('express');
const superAdminRoutes = require('./superAdminRoutes');
const publicRoutes = require('./publicRoutes');
const authRoutes = require('./authRoutes');
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
const aiRoutes = require('./aiRoutes');
const aiV1Routes = require('./aiV1Routes');
const stampDutyRoutes = require('./stampDutyRoutes');
const documentTemplateRoutes = require('./documentTemplateRoutes');
const organizationAuth = require('../middleware/organizationAuth');
const { moduleAccessMiddleware } = require('../middleware/moduleAccess');

const router = express.Router();

router.use('/super-admin', superAdminRoutes);
router.use('/', publicRoutes);
router.use('/auth', authRoutes);
router.use('/org', orgRoutes);
router.use('/clients', organizationAuth, moduleAccessMiddleware('Client Management'), clientRoutes);
router.use('/cases', organizationAuth, moduleAccessMiddleware('Case Management'), caseRoutes);
router.use('/hearings', organizationAuth, moduleAccessMiddleware('Case Management'), hearingRoutes);
router.use('/documents', organizationAuth, moduleAccessMiddleware('Document Management'), documentRoutes);
router.use('/stamp-duty', organizationAuth, moduleAccessMiddleware('Document Management'), stampDutyRoutes);
router.use('/document-templates', organizationAuth, moduleAccessMiddleware('Document Management'), documentTemplateRoutes);
router.use('/courts', organizationAuth, moduleAccessMiddleware('Case Management'), courtRoutes);
router.use('/judges', organizationAuth, moduleAccessMiddleware('Case Management'), judgeRoutes);
router.use('/benches', organizationAuth, moduleAccessMiddleware('Case Management'), benchRoutes);
router.use('/courtrooms', organizationAuth, moduleAccessMiddleware('Case Management'), courtroomRoutes);
router.use('/audit-logs', organizationAuth, moduleAccessMiddleware('Reports'), auditLogRoutes);
router.use('/analytics', organizationAuth, moduleAccessMiddleware('Reports'), analyticsRoutes);
router.use('/tasks', organizationAuth, moduleAccessMiddleware('Case Management'), taskRoutes);
router.use('/billing', organizationAuth, moduleAccessMiddleware('Billing'), billingRoutes);
router.use('/ai', organizationAuth, aiRoutes);
router.use('/v1/ai', aiV1Routes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

module.exports = router;
