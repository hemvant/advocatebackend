require('dotenv').config();

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
  }
};