// source/services/auth.service.js
// Registration and login business logic, plus JWT signing. Kept separate
// from auth.controller.js so the controller only handles HTTP concerns
// (parsing req, sending res) while this module owns the actual rules.

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/user.model');
const { ROLES } = require('../config/constants');
const { recordAuditEvent } = require('./audit.service');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../config/constants');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Registers a new PASSENGER account. Other roles (OFFICER, SENIOR_AUTHORITY,
 * ADMIN) are never self-registered — they're created/promoted by an ADMIN
 * via /api/admin/users/:id/role, per the RBAC matrix in the PRD.
 */
async function registerPassenger({ name, email, password, phone }, ipAddress = null) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    phone: phone || null,
    role: ROLES.PASSENGER,
  });

  await recordAuditEvent({
    actorUserId: user._id,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: user._id,
    newValue: { email: user.email, role: user.role },
    ipAddress,
  });

  const token = signToken(user);
  return { user, token };
}

/**
 * Validates credentials and issues a JWT. Uses a generic error message
 * for both "no such user" and "wrong password" to avoid leaking which
 * emails are registered.
 */
async function login({ email, password }, ipAddress = null) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  const genericError = () => AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  if (!user) {
    throw genericError();
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    await recordAuditEvent({
      actorUserId: user._id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user._id,
      ipAddress,
    });
    throw genericError();
  }

  if (!user.isActive) {
    throw AppError.unauthorized('This account has been disabled', 'ACCOUNT_DISABLED');
  }

  await recordAuditEvent({
    actorUserId: user._id,
    action: AUDIT_ACTIONS.USER_LOGIN,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: user._id,
    ipAddress,
  });

  const token = signToken(user);
  return { user, token };
}

module.exports = { registerPassenger, login, signToken };
