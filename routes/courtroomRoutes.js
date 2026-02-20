const express = require('express');
const courtroomController = require('../controllers/courtroomController');

const router = express.Router();
router.get('/', courtroomController.listCourtroomsAll);
module.exports = router;
