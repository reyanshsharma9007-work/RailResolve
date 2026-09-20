// source/controllers/complaint.controller.js
// HTTP layer for the complaint lifecycle. State-machine enforcement and
// side effects (audit, notifications) live in complaint.service.js; this
// controller only validates input, calls the service, and shapes output.
// Routes using :id must run ownership.middleware.js's
// loadComplaintWithAccessCheck first, which attaches req.complaint.

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const validateRequest = require('../utils/validateRequest');
const {
  validateCreateComplaintPayload,
  validateStatusUpdatePayload,
  validateCommentPayload,
  validateResolvePayload,
  validateClosePayload,
} = require('../validators/complaint.validator');

const Complaint = require('../models/complaint.model');
const ComplaintComment = require('../models/complaintComment.model');
const ComplaintStatusHistory = require('../models/complaintStatusHistory.model');
const ComplaintAiAnalysis = require('../models/complaintAiAnalysis.model');
const Attachment = require('../models/attachment.model');

const complaintService = require('../services/complaint.service');
const aiProcessingService = require('../services/aiProcessing.service');
const { recordAuditEvent } = require('../services/audit.service');
const { notifyUser } = require('../services/notification.service');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, NOTIFICATION_TYPES, ROLES, COMPLAINT_STATUS } = require('../config/constants');

/**
 * POST /api/complaints
 * Passenger creates a complaint. Responds immediately after the DB write;
 * the LLM analysis call is fired asynchronously afterward (per the PRD's
 * fail-safe pipeline) so a slow/unavailable AI provider never delays the
 * passenger-facing response.
 */
const createComplaint = catchAsync(async (req, res) => {
  validateRequest(validateCreateComplaintPayload(req.body));

  const complaint = await complaintService.createComplaint(req.user, req.body);

  // Fire-and-forget: intentionally not awaited. Errors are handled and
  // logged entirely inside aiProcessing.service.js.
  aiProcessingService.requestComplaintAnalysis(complaint);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Complaint submitted successfully',
    data: { complaint },
  });
});

/**
 * GET /api/complaints
 * Passenger: their own complaints. Officer: their department's queue.
 * Senior authority / Admin: all complaints, optionally filtered by
 * ?departmentId or ?status query params.
 */
const listComplaints = catchAsync(async (req, res) => {
  const { status, departmentId, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.user.role === ROLES.PASSENGER) {
    filter.passengerId = req.user._id;
  } else if (req.user.role === ROLES.OFFICER) {
    filter.departmentId = req.user.departmentId;
  } else if (departmentId) {
    filter.departmentId = departmentId;
  }

  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('departmentId', 'code name')
      .populate('assignedOfficerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Complaint.countDocuments(filter),
  ]);

  sendSuccess(res, {
    statusCode: 200,
    message: 'Complaints retrieved successfully',
    data: { complaints },
    meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

/**
 * GET /api/complaints/:id
 * Full detail view including AI summary, status timeline, comments, and
 * attachment metadata. req.complaint is pre-loaded and access-checked by
 * ownership.middleware.js.
 */
const getComplaintById = catchAsync(async (req, res) => {
  const complaint = await req.complaint.populate([
    { path: 'departmentId', select: 'code name' },
    { path: 'assignedOfficerId', select: 'name email' },
    { path: 'passengerId', select: 'name email' },
  ]);

  const [aiAnalysis, statusHistory, comments, attachments] = await Promise.all([
    ComplaintAiAnalysis.findOne({ complaintId: complaint._id }),
    ComplaintStatusHistory.find({ complaintId: complaint._id }).sort({ createdAt: 1 }),
    ComplaintComment.find({ complaintId: complaint._id }).populate('authorId', 'name role').sort({ createdAt: 1 }),
    Attachment.find({ complaintId: complaint._id }).select('-gridFsFileId'),
  ]);

  sendSuccess(res, {
    statusCode: 200,
    message: 'Complaint retrieved successfully',
    data: {
      complaint,
      aiAnalysis: aiAnalysis || { processingStatus: 'PENDING' },
      statusHistory,
      comments,
      attachments,
    },
  });
});

/**
 * PATCH /api/complaints/:id/status
 * Generic state-machine-guarded status update, for transitions not
 * covered by a dedicated action endpoint (e.g. moving to
 * INFORMATION_REQUIRED, or back to IN_PROGRESS after a passenger reply).
 */
const updateStatus = catchAsync(async (req, res) => {
  validateRequest(validateStatusUpdatePayload(req.body));

  const { status, note } = req.body;

  if (req.user.role === ROLES.PASSENGER) {
    throw AppError.forbidden('Passengers cannot directly change complaint status');
  }

  const updated = await complaintService.transitionStatus({
    complaint: req.complaint,
    toStatus: status,
    actor: req.user,
    note: note || null,
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Complaint status updated', data: { complaint: updated } });
});

/**
 * POST /api/complaints/:id/assign
 * Admin or a Senior Authority assigns a SUBMITTED complaint to a
 * specific officer within its department.
 */
const assignComplaint = catchAsync(async (req, res) => {
  const { officerId } = req.body;
  if (!officerId) throw AppError.badRequest('officerId is required');

  const updated = await complaintService.assignComplaintToOfficer({
    complaint: req.complaint,
    officerId,
    actor: req.user,
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Complaint assigned successfully', data: { complaint: updated } });
});

/**
 * POST /api/complaints/:id/comments
 * Adds a comment. If isInfoRequest is true and the actor is an officer,
 * also transitions the complaint to INFORMATION_REQUIRED.
 */
const addComment = catchAsync(async (req, res) => {
  validateRequest(validateCommentPayload(req.body));

  const { message, isInfoRequest } = req.body;
  const complaint = req.complaint;

  const comment = await ComplaintComment.create({
    complaintId: complaint._id,
    authorId: req.user._id,
    message,
    isInfoRequest: Boolean(isInfoRequest),
  });

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.COMMENT_ADDED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: complaint._id,
    newValue: { commentId: comment._id, isInfoRequest: Boolean(isInfoRequest) },
    ipAddress: req.ip,
  });

  if (isInfoRequest && req.user.role !== ROLES.PASSENGER) {
    await complaintService.transitionStatus({
      complaint,
      toStatus: COMPLAINT_STATUS.INFORMATION_REQUIRED,
      actor: req.user,
      note: 'Information requested from passenger',
      ipAddress: req.ip,
    });
  } else {
    // Notify the other side of the conversation about the new comment.
    const recipientId =
      req.user.role === ROLES.PASSENGER ? complaint.assignedOfficerId : complaint.passengerId;
    if (recipientId) {
      await notifyUser({
        userId: recipientId,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: `New comment on ${complaint.referenceNumber}`,
        message,
        complaintId: complaint._id,
      });
    }
  }

  sendSuccess(res, { statusCode: 201, message: 'Comment added successfully', data: { comment } });
});

/**
 * POST /api/complaints/:id/escalate
 * Manual escalation by an officer or senior authority.
 */
const escalateComplaint = catchAsync(async (req, res) => {
  const { note } = req.body;

  const updated = await complaintService.escalateComplaint({
    complaint: req.complaint,
    actor: req.user,
    note,
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Complaint escalated successfully', data: { complaint: updated } });
});

/**
 * POST /api/complaints/:id/resolve
 * Assigned officer (or senior authority) submits the resolution.
 */
const resolveComplaint = catchAsync(async (req, res) => {
  validateRequest(validateResolvePayload(req.body));

  const { resolutionNote } = req.body;

  const updated = await complaintService.resolveComplaint({
    complaint: req.complaint,
    resolutionNote,
    actor: req.user,
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Complaint resolved successfully', data: { complaint: updated } });
});

/**
 * POST /api/complaints/:id/close
 * Passenger confirms resolution and submits a 1-5 star rating.
 */
const closeComplaint = catchAsync(async (req, res) => {
  validateRequest(validateClosePayload(req.body));

  if (req.user.role !== ROLES.PASSENGER) {
    throw AppError.forbidden('Only the passenger who filed this complaint can close it');
  }

  const { rating, comment } = req.body;

  const updated = await complaintService.closeComplaint({
    complaint: req.complaint,
    rating,
    comment,
    actor: req.user,
    ipAddress: req.ip,
  });

  sendSuccess(res, { statusCode: 200, message: 'Complaint closed successfully. Thank you for your feedback!', data: { complaint: updated } });
});

module.exports = {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateStatus,
  assignComplaint,
  addComment,
  escalateComplaint,
  resolveComplaint,
  closeComplaint,
};
