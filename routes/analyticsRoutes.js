const express = require('express');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/case-duration-by-court', analyticsController.getCaseDurationByCourt);
router.get('/judge-performance', analyticsController.getJudgePerformance);
router.get('/employee-productivity', analyticsController.getEmployeeProductivity);
router.get('/case-aging-buckets', analyticsController.getCaseAgingBuckets);

module.exports = router;
