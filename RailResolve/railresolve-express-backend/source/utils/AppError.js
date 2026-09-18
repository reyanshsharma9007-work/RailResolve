// source/utils/AppError.js
// Operational error class. Controllers/services throw this for expected
// failure cases (validation, auth, not found, forbidden) and error.middleware.js
// converts it into the standard error envelope. Anything thrown that is
// NOT an AppError is treated as an unexpected bug and logged with a stack trace.

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST') {
    return new AppError(message, 400, errorCode);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = 'You are not authorized to perform this action', errorCode = 'FORBIDDEN') {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message, errorCode = 'CONFLICT') {
    return new AppError(message, 409, errorCode);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', errorCode = 'RATE_LIMITED') {
    return new AppError(message, 429, errorCode);
  }
}

module.exports = AppError;
