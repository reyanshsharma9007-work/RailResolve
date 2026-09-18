// source/middleware/rateLimit.middleware.js
// Per-route rate limiters. Applied selectively in the routers (login,
// register, complaint creation, file upload) rather than globally, since
// different endpoints have very different abuse profiles.

const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { sendError } = require('../utils/apiResponse');

function buildLimiter(max, message) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, { statusCode: 429, message, errorCode: 'RATE_LIMITED' });
    },
  });
}

const authRateLimiter = buildLimiter(
  env.AUTH_RATE_LIMIT_MAX,
  'Too many authentication attempts. Please try again later.'
);

const complaintCreationRateLimiter = buildLimiter(
  env.COMPLAINT_RATE_LIMIT_MAX,
  'Too many complaints submitted in a short period. Please try again later.'
);

const uploadRateLimiter = buildLimiter(
  env.UPLOAD_RATE_LIMIT_MAX,
  'Too many file uploads in a short period. Please try again later.'
);

module.exports = { authRateLimiter, complaintCreationRateLimiter, uploadRateLimiter };
