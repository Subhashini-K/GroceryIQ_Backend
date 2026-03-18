const { validationResult } = require('express-validator');

/**
 * Runs express-validator validationResult and returns 422 if errors exist.
 * Attach after your validator array in routes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }
  next();
};

module.exports = validate;
