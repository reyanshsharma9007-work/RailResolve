// source/validators/complaint.validator.js
// Field-level validation for complaint creation and status/comment
// payloads. Cross-entity checks (does the department exist, does the
// journey belong to this passenger) happen in complaint.service.js since
// those require database lookups, not just shape validation.

const mongoose = require('mongoose');
const { DEPARTMENT_CODE_VALUES, COMPLAINT_STATUS_VALUES } = require('../config/constants');

function validateCreateComplaintPayload(body) {
  const errors = [];
  const { journeyId, departmentCode, category, title, description, incidentDateTime } = body;

  if (!journeyId || !mongoose.Types.ObjectId.isValid(journeyId)) {
    errors.push('A valid journeyId is required');
  }
  if (!departmentCode || !DEPARTMENT_CODE_VALUES.includes(departmentCode)) {
    errors.push(`departmentCode must be one of: ${DEPARTMENT_CODE_VALUES.join(', ')}`);
  }
  if (!category || typeof category !== 'string') {
    errors.push('category is required');
  }
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('title must be at least 3 characters long');
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('description must be at least 10 characters long');
  }
  if (!incidentDateTime || isNaN(Date.parse(incidentDateTime))) {
    errors.push('A valid incidentDateTime is required');
  }

  return errors;
}

function validateStatusUpdatePayload(body) {
  const errors = [];
  const { status } = body;

  if (!status || !COMPLAINT_STATUS_VALUES.includes(status)) {
    errors.push(`status must be one of: ${COMPLAINT_STATUS_VALUES.join(', ')}`);
  }

  return errors;
}

function validateCommentPayload(body) {
  const errors = [];
  const { message } = body;

  if (!message || typeof message !== 'string' || message.trim().length < 1) {
    errors.push('message is required');
  }

  return errors;
}

function validateResolvePayload(body) {
  const errors = [];
  const { resolutionNote } = body;

  if (!resolutionNote || typeof resolutionNote !== 'string' || resolutionNote.trim().length < 5) {
    errors.push('resolutionNote must be at least 5 characters long');
  }

  return errors;
}

function validateClosePayload(body) {
  const errors = [];
  const { rating } = body;

  if (rating === undefined || rating === null || typeof rating !== 'number' || rating < 1 || rating > 5) {
    errors.push('rating must be a number between 1 and 5');
  }

  return errors;
}

module.exports = {
  validateCreateComplaintPayload,
  validateStatusUpdatePayload,
  validateCommentPayload,
  validateResolvePayload,
  validateClosePayload,
};
