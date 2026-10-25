// source/utils/apiResponse.js
// Enforces the standard response envelope from the integration contract:
//   success: { success: true, message, data }
//   error:   { success: false, message, errorCode }
// Every controller should respond through these helpers, never res.json() directly.

function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = undefined }) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendError(res, { statusCode = 500, message = 'Something went wrong', errorCode = 'INTERNAL_ERROR' }) {
  return res.status(statusCode).json({ success: false, message, errorCode });
}

module.exports = { sendSuccess, sendError };
