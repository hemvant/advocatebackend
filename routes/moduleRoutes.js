const express = require('express');
const moduleController = require('../controllers/moduleController');
const auth = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/role');

const router = express.Router();

router.get('/', auth, moduleController.listModules);

router.get('/admin/all', auth, requireSuperAdmin, moduleController.listAllModules);

module.exports = router;
