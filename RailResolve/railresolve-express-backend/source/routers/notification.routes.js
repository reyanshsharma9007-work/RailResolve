// source/routers/notification.routes.js
const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.listMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router;
