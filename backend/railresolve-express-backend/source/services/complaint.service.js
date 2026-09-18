// source/services/complaint.service.js
// Core business logic for the complaint lifecycle: creation (with SLA
// calculation), the strict state-machine transition check, and the
// side effects (audit log + notification) that go with each transition.
// Controllers call into this service rather than touching models
// directly, so the state machine can never be bypassed by a new route.

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const Complaint = require('../models/complaint.model');
const ComplaintStatusHistory = require('../models/complaintStatusHistory.model');
const Journey = require('../models/journey.model');
const Department = require('../models/department.model');
const User = require('../models/user.model');
const generateReferenceNumber = require('../utils/generateReferenceNumber');
const { computeDueAt } = require('./sla.service');
const { recordAuditEvent } = require('./audit.service');
const { notifyUser, notifyManyUsers } = require('./notification.service');
const {
  STATUS_TRANSITIONS,
  COMPLAINT_STATUS,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  ROLES,
  DEPARTMENT_CATEGORIES,
  PRIORITY,
} = require('../config/constants');

/**
 * Creates a new complaint for a passenger. Verifies the journey belongs
 * to the passenger, validates the category against the chosen department,
 * calculates the SLA due date, and writes the initial status-history entry.
 */
async function createComplaint(passenger, payload) {
  const { journeyId, departmentCode, category, title, description, incidentDateTime, priority } = payload;

  const journey = await Journey.findById(journeyId);
  if (!journey) {
    throw AppError.notFound('Journey not found', 'JOURNEY_NOT_FOUND');
  }
  if (String(journey.passengerId) !== String(passenger._id)) {
    throw AppError.forbidden('You can only file complaints against your own journeys');
  }

  const department = await Department.findOne({ code: departmentCode, isActive: true });
  if (!department) {
    throw AppError.badRequest('Selected department is invalid or inactive', 'INVALID_DEPARTMENT');
  }

  const permittedCategories = DEPARTMENT_CATEGORIES[departmentCode] || [];
  if (!permittedCategories.includes(category)) {
    throw AppError.badRequest(
      `"${category}" is not a valid category for ${department.name}. Valid categories: ${permittedCategories.join(', ')}`,
      'INVALID_CATEGORY'
    );
  }

  const effectivePriority = priority && Object.values(PRIORITY).includes(priority) ? priority : PRIORITY.MEDIUM;
  const referenceNumber = await generateReferenceNumber();
  const dueAt = await computeDueAt(effectivePriority);

  const complaint = await Complaint.create({
    referenceNumber,
    passengerId: passenger._id,
    journeyId: journey._id,
    departmentId: department._id,
    category,
    title,
    description,
    trainId: journey.trainId,
    coach: journey.coach,
    seat: journey.seat,
    stationId: journey.boardingStationId,
    incidentDateTime,
    priority: effectivePriority,
    status: COMPLAINT_STATUS.SUBMITTED,
    sla: { dueAt, overdue: false },
  });

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus: null,
    toStatus: COMPLAINT_STATUS.SUBMITTED,
    changedBy: passenger._id,
    note: 'Complaint submitted by passenger',
  });

  await recordAuditEvent({
    actorUserId: passenger._id,
    action: AUDIT_ACTIONS.COMPLAINT_CREATED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { referenceNumber, departmentCode, category, priority: effectivePriority },
  });

  return complaint;
}

/**
 * Validates and applies a status transition according to the strict
 * state machine. Throws if the transition is not allowed from the
 * complaint's current status. Records history + audit log on success.
 */
async function transitionStatus({ complaint, toStatus, actor, note = null, ipAddress = null }) {
  const fromStatus = complaint.status;
  const allowedNextStates = STATUS_TRANSITIONS[fromStatus] || [];

  if (!allowedNextStates.includes(toStatus)) {
    throw AppError.badRequest(
      `Cannot transition complaint from ${fromStatus} to ${toStatus}. Allowed next states: ${allowedNextStates.join(', ') || 'none (final state)'}`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  complaint.status = toStatus;
  if (toStatus === COMPLAINT_STATUS.RESOLVED) complaint.resolvedAt = new Date();
  if (toStatus === COMPLAINT_STATUS.CLOSED) complaint.closedAt = new Date();
  // Moving back into active work clears a prior overdue flag; the SLA
  // scheduler (sla.job.js) will re-flag it if it breaches again.
  if (toStatus === COMPLAINT_STATUS.IN_PROGRESS) complaint.sla.overdue = false;

  await complaint.save();

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus,
    toStatus,
    changedBy: actor._id,
    note,
  });

  await recordAuditEvent({
    actorUserId: actor._id,
    action: AUDIT_ACTIONS.STATUS_CHANGED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    oldValue: { status: fromStatus },
    newValue: { status: toStatus },
    ipAddress,
  });

  await notifyUser({
    userId: complaint.passengerId,
    type: NOTIFICATION_TYPES.STATUS_CHANGED,
    title: `Complaint ${complaint.referenceNumber} updated`,
    message: `Your complaint status changed from ${fromStatus} to ${toStatus}.`,
    complaintId: complaint._id,
  });

  return complaint;
}

/**
 * Assigns a complaint to a specific officer. Only valid while the
 * complaint is in SUBMITTED status (the ASSIGNED transition target).
 */
async function assignComplaintToOfficer({ complaint, officerId, actor, ipAddress = null }) {
  const officer = await User.findById(officerId);
  if (!officer || officer.role !== ROLES.OFFICER) {
    throw AppError.badRequest('Target user is not a valid officer', 'INVALID_OFFICER');
  }
  if (String(officer.departmentId) !== String(complaint.departmentId)) {
    throw AppError.badRequest('Officer does not belong to the complaint\'s department', 'DEPARTMENT_MISMATCH');
  }

  complaint.assignedOfficerId = officer._id;
  await transitionStatus({
    complaint,
    toStatus: COMPLAINT_STATUS.ASSIGNED,
    actor,
    note: `Assigned to officer ${officer.name}`,
    ipAddress,
  });

  await recordAuditEvent({
    actorUserId: actor._id,
    action: AUDIT_ACTIONS.COMPLAINT_ASSIGNED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { assignedOfficerId: officer._id },
    ipAddress,
  });

  await notifyUser({
    userId: officer._id,
    type: NOTIFICATION_TYPES.COMPLAINT_ASSIGNED,
    title: `New complaint assigned: ${complaint.referenceNumber}`,
    message: `You have been assigned complaint ${complaint.referenceNumber}.`,
    complaintId: complaint._id,
  });

  return complaint;
}

/**
 * Manual escalation to Senior Authority, triggered by an officer (as
 * opposed to the automatic SLA-breach escalation in sla.job.js).
 */
async function escalateComplaint({ complaint, actor, note, ipAddress = null }) {
  await transitionStatus({
    complaint,
    toStatus: COMPLAINT_STATUS.ESCALATED,
    actor,
    note: note || 'Manually escalated by officer',
    ipAddress,
  });

  complaint.sla.overdue = true;
  await complaint.save();

  await recordAuditEvent({
    actorUserId: actor._id,
    action: AUDIT_ACTIONS.COMPLAINT_ESCALATED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { note },
    ipAddress,
  });

  const seniorAuthorities = await User.find({ role: ROLES.SENIOR_AUTHORITY, isActive: true }).select('_id');
  await notifyManyUsers(
    seniorAuthorities.map((u) => u._id),
    {
      type: NOTIFICATION_TYPES.COMPLAINT_ESCALATED,
      title: `Complaint escalated: ${complaint.referenceNumber}`,
      message: note || 'A complaint has been escalated and requires attention.',
      complaintId: complaint._id,
    }
  );

  return complaint;
}

/**
 * Officer submits the final resolution. Sets resolutionNote and
 * transitions to RESOLVED.
 */
async function resolveComplaint({ complaint, resolutionNote, actor, ipAddress = null }) {
  complaint.resolutionNote = resolutionNote;
  await transitionStatus({
    complaint,
    toStatus: COMPLAINT_STATUS.RESOLVED,
    actor,
    note: 'Resolution submitted',
    ipAddress,
  });

  await recordAuditEvent({
    actorUserId: actor._id,
    action: AUDIT_ACTIONS.COMPLAINT_RESOLVED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { resolutionNote },
    ipAddress,
  });

  await notifyUser({
    userId: complaint.passengerId,
    type: NOTIFICATION_TYPES.COMPLAINT_RESOLVED,
    title: `Complaint ${complaint.referenceNumber} resolved`,
    message: 'Your complaint has been resolved. Please confirm and rate the resolution.',
    complaintId: complaint._id,
  });

  return complaint;
}

/**
 * Passenger confirms resolution and leaves a rating, transitioning the
 * complaint to its final CLOSED state.
 */
async function closeComplaint({ complaint, rating, comment, actor, ipAddress = null }) {
  const Feedback = require('../models/feedback.model');

  complaint.feedbackRating = rating;
  complaint.feedbackComment = comment || null;
  await transitionStatus({
    complaint,
    toStatus: COMPLAINT_STATUS.CLOSED,
    actor,
    note: 'Closed by passenger with feedback',
    ipAddress,
  });

  await Feedback.findOneAndUpdate(
    { complaintId: complaint._id },
    {
      complaintId: complaint._id,
      passengerId: complaint.passengerId,
      departmentId: complaint.departmentId,
      rating,
      comment: comment || null,
    },
    { upsert: true, new: true }
  );

  await recordAuditEvent({
    actorUserId: actor._id,
    action: AUDIT_ACTIONS.COMPLAINT_CLOSED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { rating, comment },
    ipAddress,
  });

  return complaint;
}

module.exports = {
  createComplaint,
  transitionStatus,
  assignComplaintToOfficer,
  escalateComplaint,
  resolveComplaint,
  closeComplaint,
};
