// source/validators/admin.validator.js
// Field-level validation for admin-only payloads: role changes and SLA
// rule updates.

const { ROLE_VALUES, DEPARTMENT_CODE_VALUES, PRIORITY_VALUES } = require('../config/constants');

function validateRoleChangePayload(body) {
  const errors = [];
  const { role, departmentCode } = body;

  if (!role || !ROLE_VALUES.includes(role)) {
    errors.push(`role must be one of: ${ROLE_VALUES.join(', ')}`);
  }
  if (role === 'OFFICER') {
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

module.exports = { validateRoleChangePayload, validateSlaRulePayload };
