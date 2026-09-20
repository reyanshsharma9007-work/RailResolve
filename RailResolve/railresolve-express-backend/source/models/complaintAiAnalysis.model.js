// source/models/complaintAiAnalysis.model.js
// Stores the FastAPI/LLM processing result for a complaint, kept fully
// separate from the `complaints` collection so the original passenger
// text is never touched and an AI failure never blocks complaint reads.

const mongoose = require('mongoose');

const complaintAiAnalysisSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, unique: true },
    model: { type: String, default: null },
    summary: { type: String, default: null },
    issueType: { type: String, default: null },
    extracted: {
      trainNumber: { type: String, default: null },
      station: { type: String, default: null },
      coach: { type: String, default: null },
      seat: { type: String, default: null },
    },
    keywords: { type: [String], default: [] },
    processingStatus: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    processingTimeMs: { type: Number, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ComplaintAiAnalysis', complaintAiAnalysisSchema);
