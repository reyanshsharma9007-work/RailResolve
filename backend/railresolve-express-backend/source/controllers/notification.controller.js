// source/controllers/notification.controller.js
// HTTP layer for a user's own in-app notifications.

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const Notification = require('../models/notification.model');

const listMyNotifications = catchAsync(async (req, res) => {
  const { unreadOnly } = req.query;
  const filter = { userId: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

  sendSuccess(res, {
    statusCode: 200,
    message: 'Notifications retrieved successfully',
    data: { notifications, unreadCount },
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw AppError.notFound('Notification not found');

  notification.isRead = true;
  await notification.save();

  sendSuccess(res, { statusCode: 200, message: 'Notification marked as read', data: { notification } });
});

const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
  sendSuccess(res, { statusCode: 200, message: 'All notifications marked as read', data: null });
});

module.exports = { listMyNotifications, markAsRead, markAllAsRead };
