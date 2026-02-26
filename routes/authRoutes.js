const express = require('express');
const rateLimit = require('express-rate-limit');
const sanitizeBody = require('../middleware/sanitize').sanitizeBody;
const validate = require('../middleware/validate');
const { registerOrganisationValidation, registerAdvocateValidation } = require('../utils/validators');
const registrationController = require('../controllers/registrationController');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many registration attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register-organisation', registerLimiter, sanitizeBody, registerOrganisationValidation, validate, registrationController.registerOrganisation);
router.post('/register-advocate', registerLimiter, sanitizeBody, registerAdvocateValidation, validate, registrationController.registerAdvocate);

module.exports = router;
