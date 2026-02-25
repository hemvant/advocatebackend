const express = require('express');
const rateLimit = require('express-rate-limit');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { publicRegisterValidation } = require('../utils/validators');
const registrationController = require('../controllers/registrationController');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many registration attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', registerLimiter, sanitizeBody, publicRegisterValidation, validate, registrationController.register);
router.get('/verify-email/:token', registrationController.verifyEmail);

module.exports = router;
