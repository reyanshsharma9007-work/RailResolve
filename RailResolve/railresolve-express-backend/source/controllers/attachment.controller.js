// source/controllers/attachment.controller.js
// HTTP layer for evidence file upload/listing/streaming. Ownership check
// on the parent complaint is done via loadComplaintWithAccessCheck for
// upload/list; the raw binary stream endpoint re-checks ownership itself
// since it's a distinct route not nested under /complaints/:id.

const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const Attachment = require('../models/attachment.model');
const Complaint = require('../models/complaint.model');
const attachmentService = require('../services/attachment.service');
const { recordAuditEvent } = require('../services/audit.service');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, ROLES } = require('../config/constants');

/**
 * POST /api/complaints/:id/attachments
 * req.complaint is pre-loaded/access-checked; req.file comes from
 * upload.middleware.js (multer memory storage).
 */
const uploadAttachment = catchAsync(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('No file was provided', 'FILE_REQUIRED');
  }

  const attachment = await attachmentService.storeAttachment({
    complaintId: req.complaint._id,
    uploadedBy: req.user._id,
    file: req.file,
  });

  await recordAuditEvent({
    actorUserId: req.user._id,
    action: AUDIT_ACTIONS.ATTACHMENT_UPLOADED,
    entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
    entityId: req.complaint._id,
    newValue: { attachmentId: attachment._id, originalFilename: attachment.originalFilename },
    ipAddress: req.ip,
  });

  const safeAttachment = attachment.toObject();
  delete safeAttachment.gridFsFileId;

  sendSuccess(res, { statusCode: 201, message: 'Evidence uploaded successfully', data: { attachment: safeAttachment } });
});

/**
 * GET /api/complaints/:id/attachments
 */
const listAttachments = catchAsync(async (req, res) => {
  const attachments = await Attachment.find({ complaintId: req.complaint._id }).select('-gridFsFileId');
  sendSuccess(res, { statusCode: 200, message: 'Attachments retrieved successfully', data: { attachments } });
});

/**
 * GET /api/attachments/:id
 * Streams the binary content. Performs its own access check since this
 * route is not nested under /complaints/:id.
 */
const streamAttachment = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest('Invalid attachment id', 'INVALID_ID');
  }

  const attachment = await Attachment.findById(id);
  if (!attachment) throw AppError.notFound('Attachment not found');

  const complaint = await Complaint.findById(attachment.complaintId);
  if (!complaint) throw AppError.notFound('Parent complaint not found');

  const user = req.user;
  const isOwnerPassenger = user.role === ROLES.PASSENGER && String(complaint.passengerId) === String(user._id);
  const isDeptOfficer = user.role === ROLES.OFFICER && String(complaint.departmentId) === String(user.departmentId);
  const isPrivileged = user.role === ROLES.SENIOR_AUTHORITY || user.role === ROLES.ADMIN;

  if (!isOwnerPassenger && !isDeptOfficer && !isPrivileged) {
    throw AppError.forbidden('You are not authorized to access this attachment');
  }

  res.set('Content-Type', attachment.contentType);
  res.set('Content-Disposition', `inline; filename="${attachment.originalFilename}"`);

  const downloadStream = attachmentService.openDownloadStream(attachment.gridFsFileId);
  downloadStream.on('error', () => {
    throw AppError.notFound('File content not found in storage');
  });
  downloadStream.pipe(res);
});

module.exports = { uploadAttachment, listAttachments, streamAttachment };
