const express = require('express');
const multer = require('multer');
const authenticate = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const aiController = require('../controllers/ai.controller');
const { ROLES, ALLOWED_UPLOAD_MIME_TYPES } = require('../config/constants');
const { aiRateLimiter, ticketScanRateLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();
router.use(authenticate);

router.post('/analyze-preview', requireRole(ROLES.PASSENGER), aiRateLimiter, aiController.analyzePreview);
router.post('/assistant', requireRole(ROLES.PASSENGER), aiRateLimiter, aiController.assistant);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Unsupported ticket file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    }
    cb(null, true);
  },
});
router.post('/ticket-scan', requireRole(ROLES.PASSENGER), ticketScanRateLimiter, upload.single('file'), aiController.ticketScan);

module.exports = router;
