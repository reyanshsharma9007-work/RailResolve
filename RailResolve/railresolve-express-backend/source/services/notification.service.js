// source/services/notification.service.js
// Single entry point for creating in-app notifications. Kept as a thin
// wrapper (rather than inline Notification.create calls scattered across
// controllers) so delivery channels (e.g. email/push) can be added later
// in exactly one place.

const Notification = require('../models/notification.model');
const logger = require('../utils/logger');

async function notifyUser({ userId, type, title, message, complaintId = null }) {
  try {
    return await Notification.create({ userId, type, title, message, complaintId });
  } catch (err) {
    logger.error(`Failed to create notification for user ${userId}: ${err.message}`);
    return null;
  }
}

async function notifyManyUsers(userIds, { type, title, message, complaintId = null }) {
  return Promise.all(
    userIds.map((userId) => notifyUser({ userId, type, title, message, complaintId }))
  );
}

module.exports = { notifyUser, notifyManyUsers };
