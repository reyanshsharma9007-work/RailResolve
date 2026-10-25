// source/middleware/error.middleware.js
// Single place that converts any thrown/forwarded error into the standard
// { success:false, message, errorCode } envelope. Must be registered LAST
// in app.js, after all routers.

const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');
const env = require('../config/env');

function mapKnownMongooseErrors(err) {
  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return { statusCode: 409, message: `${field} already exists`, errorCode: 'DUPLICATE_KEY' };
  }
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const firstMessage = Object.values(err.errors)[0]?.message || 'Validation failed';
    return { statusCode: 400, message: firstMessage, errorCode: 'VALIDATION_ERROR' };
  }
  // Malformed ObjectId cast
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for field: ${err.path}`, errorCode: 'INVALID_ID' };
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
      errorCode: err.errorCode,
    });
  }

  const mapped = mapKnownMongooseErrors(err);
  if (mapped) {
    return sendError(res, mapped);
  }

  // Unknown/unexpected error — log full detail server-side, never leak internals to the client.
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, { stack: err.stack });

  return sendError(res, {
    statusCode: 500,
    message: env.isProduction() ? 'Something went wrong on our end' : err.message,
    errorCode: 'INTERNAL_ERROR',
  });
}

function notFoundHandler(req, _res, next) {
  const AppError = require('../utils/AppError');
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

module.exports = { errorHandler, notFoundHandler };
