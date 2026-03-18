/**
 * Async handler wrapper to avoid repetitive try/catch in controllers.
 * Passes any thrown error to Express next() for the global error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
