const express = require('express');
const benchController = require('../controllers/benchController');

const router = express.Router();
router.get('/', benchController.listBenchesAll);
module.exports = router;
