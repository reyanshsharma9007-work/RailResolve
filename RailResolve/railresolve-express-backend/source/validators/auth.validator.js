// source/validators/auth.validator.js
// Field-level validation for registration and login payloads.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterPayload(body) {
  const errors = [];
  const { name, email, password, phone } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    errors.push('Phone must be a string');
  }

  return errors;
}

function validateLoginPayload(body) {
  const errors = [];
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required');
  }
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  return errors;
}

module.exports = { validateRegisterPayload, validateLoginPayload };
