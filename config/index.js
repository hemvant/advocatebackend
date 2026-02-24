require('dotenv').config();

// Payment gateway: when RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set, real payments are used; otherwise mock (success with random/static IDs).
const paymentKeyId = process.env.RAZORPAY_KEY_ID || '';
const paymentKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const paymentGatewayConfigured = !!(paymentKeyId && paymentKeySecret);

const whatsappApiUrl = (process.env.WHATSAPP_API_URL || '').trim();
const whatsappAccessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const whatsappPhoneId = (process.env.WHATSAPP_PHONE_ID || '').trim();
const whatsappConfigured = !!(whatsappApiUrl && whatsappAccessToken && whatsappPhoneId);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'access_token'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  },
  cookieOptions: {
    httpOnly: true,
    secure: false,
    sameSite:'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  },
  paymentGateway: {
    isConfigured: paymentGatewayConfigured,
    razorpayKeyId: paymentKeyId,
    razorpayKeySecret: paymentKeySecret
  },
  whatsapp: {
    isConfigured: whatsappConfigured,
    apiUrl: whatsappApiUrl,
    accessToken: whatsappAccessToken,
    phoneId: whatsappPhoneId
  }
};