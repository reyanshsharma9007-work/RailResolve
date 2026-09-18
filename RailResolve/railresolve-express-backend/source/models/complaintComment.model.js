// source/models/complaintComment.model.js
// Comment/info-request thread on a complaint. Used both for officer
// notes and for "information required" exchanges with the passenger.

const mongoose = require('mongoose');

const complaintCommentSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isInfoRequest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

complaintCommentSchema.index({ complaintId: 1, createdAt: 1 });

module.exports = mongoose.model('ComplaintComment', complaintCommentSchema);
