const config = require('../config');
const crypto = require('crypto');

const MOCK_ORDER_PREFIX = 'mock_ord_';
const MOCK_PAYMENT_PREFIX = 'mock_pay_';
const MOCK_TXN_PREFIX = 'txn_';

function isMock() {
  return !config.paymentGateway.isConfigured;
}

/**
 * Generate random/static IDs for mock payments.
 */
function mockId(prefix) {
  const r = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return prefix + r;
}

/**
 * Create order: real Razorpay order when gateway configured, else mock order (no external call).
 * @param {number} amountPaise - Amount in paise (e.g. 50000 = INR 500)
 * @param {string} currency - e.g. 'INR'
 * @param {string} receipt - Receipt/invoice identifier for Razorpay
 * @returns {Promise<{ orderId: string, keyId: string|null, isMock: boolean }>}
 */
async function createOrder(amountPaise, currency, receipt) {
  if (isMock()) {
    const orderId = mockId(MOCK_ORDER_PREFIX);
    return { orderId, keyId: null, isMock: true };
  }
  try {
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: config.paymentGateway.razorpayKeyId,
      key_secret: config.paymentGateway.razorpayKeySecret
    });
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: currency || 'INR',
      receipt: String(receipt)
    });
    return {
      orderId: order.id,
      keyId: config.paymentGateway.razorpayKeyId,
      isMock: false
    };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      const orderId = mockId(MOCK_ORDER_PREFIX);
      return { orderId, keyId: null, isMock: true };
    }
    throw err;
  }
}

/**
 * Verify payment: real Razorpay signature check when gateway configured; mock accepts any order_id starting with mock_ord_.
 * @param {string} orderId - Gateway order id (or mock_ord_xxx)
 * @param {string} paymentId - Gateway payment id (or mock_pay_xxx)
 * @param {string} [signature] - Razorpay signature (required for real gateway)
 * @returns {Promise<{ success: boolean, transactionId?: string, paymentId?: string }>}
 */
async function verifyPayment(orderId, paymentId, signature) {
  if (isMock()) {
    if (!orderId || !orderId.startsWith(MOCK_ORDER_PREFIX)) {
      return { success: false };
    }
    const txnId = paymentId && paymentId.startsWith(MOCK_PAYMENT_PREFIX)
      ? paymentId
      : mockId(MOCK_TXN_PREFIX);
    return {
      success: true,
      transactionId: txnId,
      paymentId: paymentId || mockId(MOCK_PAYMENT_PREFIX)
    };
  }
  if (!signature) {
    return { success: false };
  }
  const expectedSignature = crypto
    .createHmac('sha256', config.paymentGateway.razorpayKeySecret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  if (expectedSignature !== signature) {
    return { success: false };
  }
  return {
    success: true,
    transactionId: paymentId,
    paymentId
  };
}

/**
 * Get mock payment details for frontend to send to verify (when no real checkout).
 */
function getMockPaymentIdsForOrder(orderId) {
  if (!orderId || !orderId.startsWith(MOCK_ORDER_PREFIX)) return null;
  return {
    payment_id: mockId(MOCK_PAYMENT_PREFIX),
    transaction_id: mockId(MOCK_TXN_PREFIX)
  };
}

module.exports = {
  isMock,
  createOrder,
  verifyPayment,
  getMockPaymentIdsForOrder,
  MOCK_ORDER_PREFIX
};
