const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map(e => {
      const msg = e.msg || e.message || (e.error && e.error.message) || (e.nestedErrors && e.nestedErrors[0] && (e.nestedErrors[0].msg || e.nestedErrors[0].message)) || 'Invalid value';
      return {
        field: e.path || e.param,
        message: typeof msg === 'string' ? msg : 'Invalid value'
      };
    });
    const message = errors
      .map(e => (e.field ? `${e.field}: ${e.message}` : e.message))
      .join('. ');
    return res.status(400).json({
      success: false,
      message: message || 'Validation failed',
      errors
    });
  }
  next();
};

module.exports = validate;
