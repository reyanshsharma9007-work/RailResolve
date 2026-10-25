const AppError = require('../utils/AppError');

const SIGNATURES = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'application/pdf': (buffer) => buffer.subarray(0, 5).toString() === '%PDF-',
};

function validateTicketUpload(file, { maxImageBytes = 5 * 1024 * 1024, maxDocumentBytes = 10 * 1024 * 1024 } = {}) {
  if (!file) throw AppError.badRequest('A ticket image or PDF is required', 'TICKET_FILE_REQUIRED');
  const signatureCheck = SIGNATURES[file.mimetype];
  if (!signatureCheck) throw AppError.badRequest('Unsupported ticket file type', 'INVALID_FILE_TYPE');
  if (!signatureCheck(file.buffer)) throw AppError.badRequest('Uploaded file content does not match its declared type', 'INVALID_FILE_SIGNATURE');

  const maxBytes = file.mimetype.startsWith('image/') ? maxImageBytes : maxDocumentBytes;
  if (file.size > maxBytes) throw AppError.badRequest('Ticket file exceeds the maximum allowed size', 'FILE_TOO_LARGE');
  return true;
}

module.exports = { validateTicketUpload };
