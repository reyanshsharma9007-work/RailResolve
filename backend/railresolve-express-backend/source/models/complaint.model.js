// source/models/complaint.model.js
// The central document of RailResolve. Status transitions are NOT
// validated here (Mongoose enum only checks the value is a legal status,
// not that the transition from the previous status is legal) — that
// business rule lives in services/complaint.service.js's state machine.

const mongoose = require('mongoose');
const {
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_VALUES,
  PRIORITY_VALUES,
  PRIORITY,
} = require('../config/constants');

const complaintSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },

    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Journey', required: true },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    category: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },

    trainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', default: null },
    coach: { type: String, trim: true, default: null },
    seat: { type: String, trim: true, default: null },
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', default: null },

    incidentDateTime: { type: Date, required: true },

    priority: { type: String, enum: PRIORITY_VALUES, default: PRIORITY.MEDIUM },
    status: {
      type: String,
      enum: COMPLAINT_STATUS_VALUES,
      default: COMPLAINT_STATUS.SUBMITTED,
      index: true,
    },

    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    sla: {
      dueAt: { type: Date, required: true, index: true },
      overdue: { type: Boolean, default: false },
    },

    resolutionNote: { type: String, default: null },
    feedbackRating: { type: Number, min: 1, max: 5, default: null },
    feedbackComment: { type: String, default: null },

    closedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ departmentId: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
