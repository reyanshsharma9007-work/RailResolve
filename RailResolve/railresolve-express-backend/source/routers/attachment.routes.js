// source/routers/attachment.routes.js
// Standalone /api/attachments/:id route for streaming binary content.
// Not nested under /complaints/:id, so its own access check lives inside
// attachment.controller.js's streamAttachment handler.

const express = require('express');
const attachmentController = require('../controllers/attachment.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/:id', attachmentController.streamAttachment);

module.exports = router;
