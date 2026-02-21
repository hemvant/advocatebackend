const express = require('express');
const billingController = require('../controllers/billingController');

const router = express.Router();

router.get('/subscription', billingController.getMySubscription);
router.get('/invoices', billingController.getMyInvoices);

module.exports = router;
