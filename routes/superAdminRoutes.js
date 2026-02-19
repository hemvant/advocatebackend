const express = require('express');
const rateLimit = require('express-rate-limit');
const superAdminAuth = require('../middleware/superAdminAuth');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { superAdminLoginValidation, createOrganizationValidation, updateOrganizationValidation, assignOrgModulesValidation } = require('../utils/validators');
const superAdminController = require('../controllers/superAdminController');
const organizationController = require('../controllers/organizationController');
const moduleController = require('../controllers/moduleController');

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

router.get('/organizations', superAdminAuth, organizationController.list);
router.post('/organizations', superAdminAuth, sanitizeBody, createOrganizationValidation, validate, organizationController.create);
router.get('/organizations/:id', superAdminAuth, organizationController.getOne);
router.put('/organizations/:id', superAdminAuth, sanitizeBody, updateOrganizationValidation, validate, organizationController.update);
router.get('/organizations/:id/modules', superAdminAuth, organizationController.getOrgModules);
router.put('/organizations/:id/modules', superAdminAuth, sanitizeBody, assignOrgModulesValidation, validate, organizationController.assignModules);

router.get('/modules', superAdminAuth, moduleController.listAll);

module.exports = router;
