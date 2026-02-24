const express = require('express');
const billingController = require('../controllers/billingController');
const { createOrderValidation, verifyPaymentValidation, createAdvocateInvoiceValidation, updateAdvocateInvoiceValidation } = require('../utils/validators');
const validate = require('../middleware/validate');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;

const router = express.Router();

router.get('/subscription', billingController.getMySubscription);
router.get('/invoices', billingController.getMyInvoices);
router.get('/dashboard-stats', billingController.getBillingDashboardStats);
router.get('/expenses-by-case', billingController.getExpensesByCase);
router.post('/invoices', sanitizeBody, createAdvocateInvoiceValidation, validate, billingController.createAdvocateInvoice);
router.put('/invoices/:id', sanitizeBody, updateAdvocateInvoiceValidation, validate, billingController.updateAdvocateInvoice);
router.post('/invoices/:id/send-reminder', billingController.sendInvoiceReminderWhatsApp);
router.get('/packages', billingController.getPackages);
router.get('/payment-gateway-status', billingController.paymentGatewayStatus);
router.post('/create-order', sanitizeBody, createOrderValidation, validate, billingController.createOrder);
router.post('/verify-payment', sanitizeBody, verifyPaymentValidation, validate, billingController.verifyPayment);

module.exports = router;
