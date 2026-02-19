const express = require('express');
const superAdminRoutes = require('./superAdminRoutes');
const orgRoutes = require('./orgRoutes');
const clientRoutes = require('./clientRoutes');
const caseRoutes = require('./caseRoutes');
const hearingRoutes = require('./hearingRoutes');
const documentRoutes = require('./documentRoutes');
const organizationAuth = require('../middleware/organizationAuth');
const { moduleAccessMiddleware } = require('../middleware/moduleAccess');

const router = express.Router();

router.use('/super-admin', superAdminRoutes);
router.use('/org', orgRoutes);
router.use('/clients', organizationAuth, moduleAccessMiddleware('Client Management'), clientRoutes);
router.use('/cases', organizationAuth, moduleAccessMiddleware('Case Management'), caseRoutes);
router.use('/hearings', organizationAuth, moduleAccessMiddleware('Case Management'), hearingRoutes);
router.use('/documents', organizationAuth, moduleAccessMiddleware('Document Management'), documentRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

module.exports = router;
