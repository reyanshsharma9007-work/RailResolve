// source/controllers/admin.controller.js
// HTTP layer for ADMIN-only operations. Every route this controller
// serves is mounted behind requireRole(ROLES.ADMIN) in admin.routes.js,
// except audit log reads and analytics which also permit SENIOR_AUTHORITY
// per the RBAC matrix.

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const validateRequest = require('../utils/validateRequest');
const {
  validateCreateUserPayload,
  validateRoleChangePayload,
  validateSlaRulePayload,
} = require('../validators/admin.validator');

const User = require('../models/user.model');
const Department = require('../models/department.model');
const AuditLog = require('../models/auditLog.model');
const SlaRule = require('../models/slaRule.model');

const analyticsService = require('../services/analytics.service');
const { recordAuditEvent } = require('../services/audit.service');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, ROLES } = require('../config/constants');

const listUsers = catchAsync(async (req, res) => {
  const { role, departmentId, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (departmentId) filter.departmentId = departmentId;
  if (search) {
    // Escaped so a user-supplied string can never act as a regex.
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('departmentId', 'code name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, {
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: { users },
    meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

/**
 * POST /api/admin/users
 * Creates a staff account (OFFICER, SENIOR_AUTHORITY or ADMIN) directly,
 * with a password the admin hands to that person. This is the counterpart
 * to /api/auth/register, which is PASSENGER-only: staff are provisioned,
 * never self-served. An OFFICER must be given a departmentCode, which is
 * what scopes their complaint queue and makes them assignable.
 */
const createUser = catchAsync(async (req, res) => {
  validateRequest(validateCreateUserPayload(req.body));

  const { name, email, password, role, departmentCode, phone } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  let departmentId = null;
  if (role === ROLES.OFFICER) {
    const department = await Department.findOne({ code: departmentCode, isActive: true });
    if (!department) {
      throw AppError.badRequest('Selected department is invalid or inactive', 'INVALID_DEPARTMENT');
    }
    departmentId = department._id;
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    departmentId,
    phone: phone || null,
  });

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: user._id,
    newValue: { email: user.email, role: user.role, departmentId: user.departmentId },
    ipAddress: req.ip,
  });

  await user.populate('departmentId', 'code name');

  sendSuccess(res, {
    statusCode: 201,
    message: 'Staff account created successfully',
    data: { user },
  });
});

/**
 * PATCH /api/admin/users/:id/role
 * Promotes/changes an existing user's role, and — when assigning OFFICER —
 * their department.
 */
const updateUserRole = catchAsync(async (req, res) => {
  validateRequest(validateRoleChangePayload(req.body));

  const { role, departmentCode } = req.body;
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw AppError.notFound('User not found');

  if (String(targetUser._id) === String(req.user._id)) {
    throw AppError.badRequest('You cannot change your own role', 'SELF_ROLE_CHANGE');
  }

  const oldValue = { role: targetUser.role, departmentId: targetUser.departmentId };

  targetUser.role = role;

  if (role === ROLES.OFFICER) {
    const department = await Department.findOne({ code: departmentCode, isActive: true });
    if (!department) throw AppError.badRequest('Selected department is invalid or inactive', 'INVALID_DEPARTMENT');
    targetUser.departmentId = department._id;
  } else {
    targetUser.departmentId = null;
  }

  await targetUser.save();

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.ROLE_CHANGED,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: targetUser._id,
    oldValue,
    newValue: { role: targetUser.role, departmentId: targetUser.departmentId },
    ipAddress: req.ip,
  });

  await targetUser.populate('departmentId', 'code name');

  sendSuccess(res, { statusCode: 200, message: 'User role updated successfully', data: { user: targetUser } });
});

const deactivateUser = catchAsync(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw AppError.notFound('User not found');

  if (String(targetUser._id) === String(req.user._id)) {
    throw AppError.badRequest('You cannot deactivate your own account', 'SELF_DEACTIVATION');
  }

  targetUser.isActive = false;
  await targetUser.save();
  await targetUser.populate('departmentId', 'code name');

  sendSuccess(res, { statusCode: 200, message: 'User deactivated successfully', data: { user: targetUser } });
});

/**
 * PATCH /api/admin/users/:id/activate
 * Re-enables a previously deactivated account. Without this, deactivation
 * is a one-way door and a mistake can only be undone in the database.
 */
const activateUser = catchAsync(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw AppError.notFound('User not found');

  targetUser.isActive = true;
  await targetUser.save();
  await targetUser.populate('departmentId', 'code name');

  sendSuccess(res, { statusCode: 200, message: 'User reactivated successfully', data: { user: targetUser } });
});

/**
 * PATCH /api/admin/users/:id/password
 * Admin-set password reset for a staff account that has lost access.
 */
const resetUserPassword = catchAsync(async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw AppError.badRequest('Password must be at least 8 characters long', 'VALIDATION_ERROR');
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw AppError.notFound('User not found');

  targetUser.passwordHash = await User.hashPassword(password);
  await targetUser.save();

  sendSuccess(res, { statusCode: 200, message: 'Password reset successfully', data: { user: targetUser } });
});

/**
 * GET /api/admin/audit-logs
 * Read-only by design — no PATCH/DELETE route exists for audit_logs.
 */
const listAuditLogs = catchAsync(async (req, res) => {
  const { entityType, entityId, action, actorUserId, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = action;
  if (actorUserId) filter.actorUserId = actorUserId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorUserId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, {
    statusCode: 200,
    message: 'Audit logs retrieved successfully',
    data: { logs },
    meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

const getAnalytics = catchAsync(async (req, res) => {
  const overview = await analyticsService.getAnalyticsOverview();
  sendSuccess(res, { statusCode: 200, message: 'Analytics retrieved successfully', data: overview });
});

const listDepartments = catchAsync(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  sendSuccess(res, { statusCode: 200, message: 'Departments retrieved successfully', data: { departments } });
});

const updateDepartment = catchAsync(async (req, res) => {
  const { name, description, isActive } = req.body;
  const department = await Department.findById(req.params.id);
  if (!department) throw AppError.notFound('Department not found');

  const oldValue = { name: department.name, description: department.description, isActive: department.isActive };

  if (name !== undefined) department.name = name;
  if (description !== undefined) department.description = description;
  if (isActive !== undefined) department.isActive = isActive;

  await department.save();

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.DEPARTMENT,
    entityId: department._id,
    oldValue,
    newValue: { name: department.name, description: department.description, isActive: department.isActive },
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Department updated successfully', data: { department } });
});

const listSlaRules = catchAsync(async (req, res) => {
  const rules = await SlaRule.find();
  sendSuccess(res, { statusCode: 200, message: 'SLA rules retrieved successfully', data: { rules } });
});

const upsertSlaRule = catchAsync(async (req, res) => {
  validateRequest(validateSlaRulePayload(req.body));

  const { priority, targetMinutes } = req.body;

  const existing = await SlaRule.findOne({ priority });
  const oldValue = existing ? { targetMinutes: existing.targetMinutes } : null;

  const rule = await SlaRule.findOneAndUpdate(
    { priority },
    { priority, targetMinutes },
    { upsert: true, new: true }
  );

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.SLA_RULE_UPDATED,
    entityType: AUDIT_ENTITY_TYPES.SLA,
    entityId: rule._id,
    oldValue,
    newValue: { targetMinutes },
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'SLA rule updated successfully', data: { rule } });
});

module.exports = {
  listUsers,
  createUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  resetUserPassword,
  listAuditLogs,
  getAnalytics,
  listDepartments,
  updateDepartment,
  listSlaRules,
  upsertSlaRule,
};
