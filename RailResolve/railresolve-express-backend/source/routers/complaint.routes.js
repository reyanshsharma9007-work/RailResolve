// source/routers/complaint.routes.js
// Every :id route runs loadComplaintWithAccessCheck AFTER authenticate,
// so req.complaint is always pre-loaded and object-level-authorized
// before the controller runs (IDOR protection per PRD section 9).

const express = require('express');
const complaintController = require('../controllers/complaint.controller');
const attachmentController = require('../controllers/attachment.controller');
const authenticate = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const { loadComplaintWithAccessCheck } = require('../middleware/ownership.middleware');
const { complaintCreationRateLimiter, uploadRateLimiter } = require('../middleware/rateLimit.middleware');
const upload = require('../middleware/upload.middleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(authenticate);

// Create / list — no :id, so no ownership middleware; filtering by
// ownership/department happens inside the controller for list.
router.post('/', requireRole(ROLES.PASSENGER), complaintCreationRateLimiter, complaintController.createComplaint);
router.get('/', complaintController.listComplaints);

// All routes below operate on a specific complaint.
router.get('/:id', loadComplaintWithAccessCheck, complaintController.getComplaintById);

router.patch(
  '/:id/status',
  loadComplaintWithAccessCheck,
  requireRole(ROLES.OFFICER, ROLES.SENIOR_AUTHORITY, ROLES.ADMIN),
  complaintController.updateStatus
);

router.post(
  '/:id/assign',
  loadComplaintWithAccessCheck,
  requireRole(ROLES.SENIOR_AUTHORITY, ROLES.ADMIN),
  complaintController.assignComplaint
);

router.post('/:id/comments', loadComplaintWithAccessCheck, complaintController.addComment);

router.post(
  '/:id/escalate',
  loadComplaintWithAccessCheck,
  requireRole(ROLES.OFFICER, ROLES.SENIOR_AUTHORITY, ROLES.ADMIN),
  complaintController.escalateComplaint
);

router.post(
  '/:id/resolve',
  loadComplaintWithAccessCheck,
  requireRole(ROLES.OFFICER, ROLES.SENIOR_AUTHORITY, ROLES.ADMIN),
  complaintController.resolveComplaint
);

router.post(
  '/:id/close',
  loadComplaintWithAccessCheck,
  requireRole(ROLES.PASSENGER),
  complaintController.closeComplaint
);

// Evidence attachments nested under a complaint.
router.post(
  '/:id/attachments',
  loadComplaintWithAccessCheck,
  uploadRateLimiter,
  upload.single('file'),
  attachmentController.uploadAttachment
);

router.get('/:id/attachments', loadComplaintWithAccessCheck, attachmentController.listAttachments);

module.exports = router;
