const express = require('express');
const rateLimit = require('express-rate-limit');
const organizationAuth = require('../middleware/organizationAuth');
const { requireOrgAdmin, requireOrgAdminOrEmployee } = require('../middleware/orgRole');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { orgLoginValidation, createOrgUserValidation, updateOrgUserValidation, assignEmployeeModulesValidation, resetEmployeePasswordValidation } = require('../utils/validators');
const orgAuthController = require('../controllers/orgAuthController');
const organizationUserController = require('../controllers/organizationUserController');
const moduleController = require('../controllers/moduleController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, sanitizeBody, orgLoginValidation, validate, orgAuthController.login);
router.post('/logout', orgAuthController.logout);
router.get('/me', organizationAuth, orgAuthController.me);
router.get('/my-modules', organizationAuth, orgAuthController.myModules);

router.get('/employees', organizationAuth, requireOrgAdminOrEmployee, organizationUserController.list);
router.post('/employees', organizationAuth, requireOrgAdmin, sanitizeBody, createOrgUserValidation, validate, organizationUserController.create);
router.get('/employees/:id', organizationAuth, requireOrgAdminOrEmployee, organizationUserController.getOne);
router.put('/employees/:id', organizationAuth, requireOrgAdmin, sanitizeBody, updateOrgUserValidation, validate, organizationUserController.update);
router.get('/employees/:id/modules', organizationAuth, requireOrgAdmin, organizationUserController.getEmployeeModules);
router.put('/employees/:id/modules', organizationAuth, requireOrgAdmin, assignEmployeeModulesValidation, validate, organizationUserController.assignEmployeeModules);
router.put('/employees/:id/reset-password', organizationAuth, requireOrgAdmin, sanitizeBody, resetEmployeePasswordValidation, validate, organizationUserController.resetPassword);

router.get('/modules', organizationAuth, moduleController.list);

module.exports = router;
