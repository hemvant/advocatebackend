const express = require('express');
const billingController = require('../controllers/billingController');
const { createOrderValidation, verifyPaymentValidation } = require('../utils/validators');
const { validate } = require('../middleware/validate');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;

const router = express.Router();

router.get('/subscription', billingController.getMySubscription);
router.get('/invoices', billingController.getMyInvoices);
router.get('/packages', billingController.getPackages);
router.get('/payment-gateway-status', billingController.paymentGatewayStatus);
router.post('/create-order', sanitizeBody, createOrderValidation, validate, billingController.createOrder);
router.post('/verify-payment', sanitizeBody, verifyPaymentValidation, validate, billingController.verifyPayment);

module.exports = router;
