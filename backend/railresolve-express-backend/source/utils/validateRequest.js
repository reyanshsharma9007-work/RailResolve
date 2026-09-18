// source/utils/validateRequest.js
// Lightweight manual validation helper (no extra dependency). Each
// validator module exports a function that returns an array of error
// strings; this turns that into a thrown AppError if non-empty.

const AppError = require('./AppError');

function validateRequest(errors) {
  if (errors && errors.length > 0) {
    throw AppError.badRequest(errors[0], 'VALIDATION_ERROR');
  }
}

module.exports = validateRequest;
