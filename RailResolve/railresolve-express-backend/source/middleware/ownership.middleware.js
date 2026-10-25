// source/middleware/ownership.middleware.js
// Object-level authorization (IDOR protection). RBAC alone only checks
// "is this user an OFFICER"; this checks "does this specific officer/
// passenger actually own or have department access to THIS complaint."
// Must run after auth.middleware.js. Loads the complaint once and attaches
// it to req.complaint so the downstream controller doesn't re-fetch it.

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const Complaint = require('../models/complaint.model');
const { ROLES } = require('../config/constants');

/**
 * Loads the complaint by :id param and verifies the requester may access it:
 * - PASSENGER: must be the complaint's own passengerId
 * - OFFICER: must belong to the complaint's department
 * - SENIOR_AUTHORITY / ADMIN: full access
 */
const loadComplaintWithAccessCheck = catchAsync(async (req, _res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid complaint id', 'INVALID_ID');
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    throw AppError.notFound('Complaint not found');
  }

  const user = req.user;

  if (user.role === ROLES.ADMIN || user.role === ROLES.SENIOR_AUTHORITY) {
    req.complaint = complaint;
    return next();
  }

  if (user.role === ROLES.PASSENGER) {
    if (String(complaint.passengerId) !== String(user._id)) {
      throw AppError.forbidden('You are not authorized to access this complaint');
    }
    req.complaint = complaint;
    return next();
  }

  if (user.role === ROLES.OFFICER) {
    if (!user.departmentId || String(complaint.departmentId) !== String(user.departmentId)) {
      throw AppError.forbidden('This complaint does not belong to your department');
    }
    req.complaint = complaint;
    return next();
  }

  throw AppError.forbidden();
});

module.exports = { loadComplaintWithAccessCheck };
