const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/role');
const validate = require('../middleware/validate');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const { approveUserValidation, assignModulesValidation, updateUserValidation } = require('../utils/validators');

const router = express.Router();

router.use(auth, requireSuperAdmin);
router.use(sanitizeBody);

router.get('/', userController.listUsers);
router.get('/:id', userController.getUser);
router.patch('/:id/approve', approveUserValidation, validate, userController.approveUser);
router.patch('/:id', updateUserValidation, validate, userController.updateUser);
router.put('/:id/modules', assignModulesValidation, validate, userController.assignModules);

module.exports = router;
