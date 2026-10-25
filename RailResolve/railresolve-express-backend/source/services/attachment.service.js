// source/services/attachment.service.js
// Handles evidence file validation and storage into GridFS. Generates an
// internal UUID filename for storage (never the client-supplied original
// filename) to prevent path-traversal and filename-collision issues.

const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const AppError = require('../utils/AppError');
const { getGridFsBucket } = require('../database/database');
const Attachment = require('../models/attachment.model');
const env = require('../config/env');
const {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
} = require('../config/constants');

function validateFileConstraints(file) {
  const isImage = ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype);
  const isDocument = ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype);

  if (!isImage && !isDocument) {
    throw AppError.badRequest('Unsupported file type. Only JPEG, PNG, and PDF are allowed.', 'INVALID_FILE_TYPE');
  }

  const sizeLimit = isImage ? env.MAX_IMAGE_SIZE_BYTES : env.MAX_DOCUMENT_SIZE_BYTES;
  if (file.size > sizeLimit) {
    const limitMb = Math.round(sizeLimit / (1024 * 1024));
    throw AppError.badRequest(`File exceeds the maximum allowed size of ${limitMb}MB for this file type`, 'FILE_TOO_LARGE');
  }
}

/**
 * Streams a validated file buffer into the GridFS "evidence" bucket and
 * writes a matching Attachment metadata document.
 */
async function storeAttachment({ complaintId, uploadedBy, file }) {
  validateFileConstraints(file);

  const bucket = getGridFsBucket();
  const storageFilename = `${uuidv4()}-${Date.now()}`;

  const gridFsFileId = await new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(storageFilename, {
      contentType: file.mimetype,
      metadata: { complaintId: String(complaintId), uploadedBy: String(uploadedBy) },
    });

    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });

  const attachment = await Attachment.create({
    complaintId,
    uploadedBy,
    gridFsFileId,
    storageFilename,
    originalFilename: file.originalname,
    contentType: file.mimetype,
    size: file.size,
  });

  return attachment;
}

/**
 * Returns a readable stream for a stored attachment, for the download/
 * view endpoint to pipe directly to the HTTP response.
 */
function openDownloadStream(gridFsFileId) {
  const bucket = getGridFsBucket();
  return bucket.openDownloadStream(gridFsFileId);
}

module.exports = { storeAttachment, openDownloadStream };
