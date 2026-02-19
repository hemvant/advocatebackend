const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const { registerValidation, loginValidation } = require('../utils/validators');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', sanitizeBody, registerValidation, validate, authController.register);
router.post('/login', loginLimiter, sanitizeBody, loginValidation, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.me);

module.exports = router;
