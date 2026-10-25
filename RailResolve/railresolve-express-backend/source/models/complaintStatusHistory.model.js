// source/models/complaintStatusHistory.model.js
// Append-only timeline of every status transition a complaint goes
// through, used to render the passenger/officer-facing complaint timeline.

const mongoose = require('mongoose');
const { COMPLAINT_STATUS_VALUES } = require('../config/constants');

const complaintStatusHistorySchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    fromStatus: { type: String, enum: [...COMPLAINT_STATUS_VALUES, null], default: null },
    toStatus: { type: String, enum: COMPLAINT_STATUS_VALUES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

complaintStatusHistorySchema.index({ complaintId: 1, createdAt: 1 });

module.exports = mongoose.model('ComplaintStatusHistory', complaintStatusHistorySchema);
