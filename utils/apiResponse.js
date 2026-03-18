/**
 * Standardised API response helpers.
 * All responses follow: { success, message, data, meta, errors }
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

const errorResponse = (res, statusCode = 500, message = 'Error', errors = null) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
