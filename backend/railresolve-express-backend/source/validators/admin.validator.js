// source/validators/admin.validator.js
// Field-level validation for admin-only payloads: staff account creation,
// role changes and SLA rule updates.
const { ROLES, ROLE_VALUES, DEPARTMENT_CODE_VALUES, PRIORITY_VALUES } = require('../config/constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Roles an admin may create directly. PASSENGER is excluded on purpose —
// passengers self-register through /api/auth/register.
const CREATABLE_ROLES = [ROLES.OFFICER, ROLES.SENIOR_AUTHORITY, ROLES.ADMIN];

function validateCreateUserPayload(body) {
  const errors = [];
  const { name, email, password, role, departmentCode, phone } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email address is required');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!role || !CREATABLE_ROLES.includes(role)) {
    errors.push(`role must be one of: ${CREATABLE_ROLES.join(', ')}`);
  }
  if (role === ROLES.OFFICER) {
    if (!departmentCode || !DEPARTMENT_CODE_VALUES.includes(departmentCode)) {
      errors.push('A valid departmentCode is required when creating an OFFICER');
    }
  }
  if (phone !== undefined && phone !== null && phone !== '' && typeof phone !== 'string') {
    errors.push('Phone must be a string');
  }

  return errors;
}

function validateRoleChangePayload(body) {
  const errors = [];
  const { role, departmentCode } = body;

  if (!role || !ROLE_VALUES.includes(role)) {
    errors.push(`role must be one of: ${ROLE_VALUES.join(', ')}`);
  }
  if (role === ROLES.OFFICER) {
    if (!departmentCode || !DEPARTMENT_CODE_VALUES.includes(departmentCode)) {
      errors.push('A valid departmentCode is required when assigning the OFFICER role');
    }
  }

  return errors;
}

function validateSlaRulePayload(body) {
  const errors = [];
  const { priority, targetMinutes } = body;

  if (!priority || !PRIORITY_VALUES.includes(priority)) {
    errors.push(`priority must be one of: ${PRIORITY_VALUES.join(', ')}`);
  }
  if (targetMinutes === undefined || typeof targetMinutes !== 'number' || targetMinutes < 1) {
    errors.push('targetMinutes must be a positive number');
  }

  return errors;
}

module.exports = {
  validateCreateUserPayload,
  validateRoleChangePayload,
  validateSlaRulePayload,
  CREATABLE_ROLES,
};
