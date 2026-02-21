const express = require('express');
const rateLimit = require('express-rate-limit');
const superAdminAuth = require('../middleware/superAdminAuth');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { superAdminLoginValidation, createOrganizationValidation, updateOrganizationValidation, assignOrgModulesValidation, resetOrgAdminPasswordValidation } = require('../utils/validators');
const superAdminController = require('../controllers/superAdminController');
const organizationController = require('../controllers/organizationController');
const moduleController = require('../controllers/moduleController');
const superAdminDashboardController = require('../controllers/superAdminDashboardController');
const superAdminAnalyticsController = require('../controllers/superAdminAnalyticsController');
const superAdminRevenueController = require('../controllers/superAdminRevenueController');
const superAdminSystemController = require('../controllers/superAdminSystemController');
const superAdminOrganizationController = require('../controllers/superAdminOrganizationController');
const superAdminAuditController = require('../controllers/superAdminAuditController');
const superAdminSubscriptionsController = require('../controllers/superAdminSubscriptionsController');
const superAdminPackageController = require('../controllers/superAdminPackageController');
const superAdminInvoiceController = require('../controllers/superAdminInvoiceController');
const { createPackageValidation, updatePackageValidation, assignSubscriptionValidation, createInvoiceValidation, markInvoicePaidValidation } = require('../utils/validators');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, sanitizeBody, superAdminLoginValidation, validate, superAdminController.login);
router.post('/logout', superAdminController.logout);
router.get('/me', superAdminAuth, superAdminController.me);

router.get('/dashboard/summary', superAdminAuth, superAdminDashboardController.getSummary);
router.get('/dashboard/analytics', superAdminAuth, superAdminAnalyticsController.getCharts);
router.get('/revenue-summary', superAdminAuth, superAdminRevenueController.getRevenueSummary);
router.get('/system-health', superAdminAuth, superAdminSystemController.getSystemHealth);

router.get('/organizations', superAdminAuth, superAdminOrganizationController.listOrganizations);
router.post('/organizations', superAdminAuth, sanitizeBody, createOrganizationValidation, validate, organizationController.create);
router.get('/organizations/:id', superAdminAuth, organizationController.getOne);
router.get('/organizations/:id/detail', superAdminAuth, superAdminOrganizationController.getOrganizationDetail);
router.put('/organizations/:id', superAdminAuth, sanitizeBody, updateOrganizationValidation, validate, organizationController.update);
router.get('/organizations/:id/modules', superAdminAuth, organizationController.getOrgModules);
router.put('/organizations/:id/modules', superAdminAuth, sanitizeBody, assignOrgModulesValidation, validate, organizationController.assignModules);
router.post('/organizations/:organizationId/impersonate', superAdminAuth, superAdminOrganizationController.impersonate);
router.put('/organizations/:id/reset-admin-password', superAdminAuth, sanitizeBody, resetOrgAdminPasswordValidation, validate, superAdminOrganizationController.resetOrgAdminPassword);

router.get('/subscriptions', superAdminAuth, superAdminSubscriptionsController.listSubscriptions);
router.post('/organizations/:organizationId/subscription', superAdminAuth, sanitizeBody, assignSubscriptionValidation, validate, superAdminSubscriptionsController.assignSubscription);

router.get('/packages', superAdminAuth, superAdminPackageController.listPackages);
router.get('/packages/:id', superAdminAuth, superAdminPackageController.getPackage);
router.post('/packages', superAdminAuth, sanitizeBody, createPackageValidation, validate, superAdminPackageController.createPackage);
router.put('/packages/:id', superAdminAuth, sanitizeBody, updatePackageValidation, validate, superAdminPackageController.updatePackage);
router.delete('/packages/:id', superAdminAuth, superAdminPackageController.deletePackage);

router.get('/invoices', superAdminAuth, superAdminInvoiceController.listInvoices);
router.post('/invoices', superAdminAuth, sanitizeBody, createInvoiceValidation, validate, superAdminInvoiceController.createInvoice);
router.put('/invoices/:id/mark-paid', superAdminAuth, sanitizeBody, markInvoicePaidValidation, validate, superAdminInvoiceController.markInvoicePaid);

router.get('/audit-logs', superAdminAuth, superAdminAuditController.listPlatformAuditLogs);

router.get('/modules', superAdminAuth, moduleController.listAll);

module.exports = router;
