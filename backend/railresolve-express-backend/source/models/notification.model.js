// source/models/notification.model.js
// In-app notifications delivered to a specific user (passenger, officer,
// or senior authority) about complaint lifecycle events.

const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
