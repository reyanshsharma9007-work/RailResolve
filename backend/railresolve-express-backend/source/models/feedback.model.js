// source/models/feedback.model.js
// Standalone feedback record captured on complaint closure. Duplicated
// (rating/comment) onto the complaint document itself for quick reads,
// but this collection is the canonical, queryable feedback history used
// by admin analytics.

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, unique: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
