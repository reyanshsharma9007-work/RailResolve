// source/middleware/upload.middleware.js
// Multer configured to buffer uploads in memory (files are streamed into
// GridFS by the controller, never written to local disk). Validates MIME
// type here as a first line of defense; attachment.service.js re-validates
// the actual file signature before persisting, since the client-supplied
// mimetype can be spoofed.

const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { ALLOWED_UPLOAD_MIME_TYPES } = require('../config/constants');

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
    return cb(AppError.badRequest('Unsupported file type. Only JPEG, PNG, and PDF are allowed.', 'INVALID_FILE_TYPE'));
  }
  cb(null, true);
}

// Cap at the larger of the two limits here; service-layer validation
// applies the precise per-type limit (5MB image / 10MB document).
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_DOCUMENT_SIZE_BYTES },
});

module.exports = upload;
