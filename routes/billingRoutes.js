const express = require('express');
const billingController = require('../controllers/billingController');
const {
  createOrderValidation,
  verifyPaymentValidation,
  createAdvocateInvoiceValidation,
  updateAdvocateInvoiceValidation,
  recordPaymentValidation,
  createExpenseValidation,
  updateExpenseValidation,
  createTdsRecordValidation
} = require('../utils/validators');
const validate = require('../middleware/validate');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;

const router = express.Router();

router.get('/subscription', billingController.getMySubscription);
router.get('/invoices', billingController.getMyInvoices);
router.get('/invoices/export/csv', billingController.exportInvoicesCsv);
router.get('/invoices/:id', billingController.getInvoiceById);
router.get('/invoices/:id/pdf', billingController.getInvoicePdf);
router.get('/invoices/:id/upi-payload', billingController.getInvoiceUpiPayload);
router.get('/dashboard-stats', billingController.getBillingDashboardStats);
router.get('/expenses-by-case', billingController.getExpensesByCase);
router.get('/gst-summary', billingController.getGstSummary);
router.get('/expenses', billingController.listExpenses);
router.get('/expenses/monthly-report', billingController.getExpensesMonthlyReport);
router.get('/tds', billingController.listTdsRecords);
router.get('/tds/yearly-statement', billingController.getTdsYearlyStatement);

router.post('/invoices', sanitizeBody, createAdvocateInvoiceValidation, validate, billingController.createAdvocateInvoice);
router.put('/invoices/:id', sanitizeBody, updateAdvocateInvoiceValidation, validate, billingController.updateAdvocateInvoice);
router.post('/invoices/:id/send-reminder', billingController.sendInvoiceReminderWhatsApp);
router.post('/invoices/:id/reminder', sanitizeBody, billingController.sendInvoiceReminder);
router.post('/invoices/:id/payments', sanitizeBody, recordPaymentValidation, validate, billingController.recordPayment);

router.post('/expenses', sanitizeBody, createExpenseValidation, validate, billingController.createExpense);
router.put('/expenses/:id', sanitizeBody, updateExpenseValidation, validate, billingController.updateExpense);
router.delete('/expenses/:id', billingController.deleteExpense);

router.post('/tds', sanitizeBody, createTdsRecordValidation, validate, billingController.createTdsRecord);

router.get('/packages', billingController.getPackages);
router.get('/payment-gateway-status', billingController.paymentGatewayStatus);
router.post('/create-order', sanitizeBody, createOrderValidation, validate, billingController.createOrder);
router.post('/verify-payment', sanitizeBody, verifyPaymentValidation, validate, billingController.verifyPayment);

module.exports = router;
