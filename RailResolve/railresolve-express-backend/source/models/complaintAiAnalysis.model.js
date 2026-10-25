const mongoose = require("mongoose");

const complaintAiAnalysisSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      unique: true,
    },
    model: { type: String, default: null },
    modelVersion: { type: String, default: null },
    issueType: { type: String, default: null },
    category: { type: String, default: null },
    subcategory: { type: String, default: null },
    department: { type: String, default: null },
    categoryConfidence: { type: Number, min: 0, max: 1, default: null },
    categoryStatus: { type: String, default: "RULE_BASED" },
    categoryReason: { type: String, default: null },

    aiRecommendedPriority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", null],
      default: null,
    },
    finalPriority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", null],
      default: null,
    },
    finalPrioritySource: { type: String, default: null },
    finalPriorityReason: { type: String, default: null },
    priorityConfidence: { type: Number, min: 0, max: 1, default: null },
    priorityStatus: { type: String, default: "RULE_BASED" },
    priorityReasons: { type: [String], default: [] },

    // Model 2: advisory-only urgency prediction
    priorityModel2: {
      modelVersion: { type: String, default: null },
      predictedUrgency: {
        type: String,
        enum: ["low", "medium", "high", null],
        default: null,
      },
      recommendedPriority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", null],
        default: null,
      },
      confidence: { type: Number, min: 0, max: 1, default: null },
      probabilities: {
        low: { type: Number, default: null },
        medium: { type: Number, default: null },
        high: { type: Number, default: null },
      },
      advisoryOnly: { type: Boolean, default: true },
      lowCoverage: { type: Boolean, default: null },
      vocabularyCoverage: { type: Number, default: null },
      warnings: { type: [String], default: [] },
      status: {
        type: String,
        enum: ["NOT_RUN", "SUCCESS", "UNAVAILABLE"],
        default: "NOT_RUN",
      },
    },

    humanReviewRequired: { type: Boolean, default: false },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
    },
    duplicateSimilarity: { type: Number, min: 0, max: 1, default: null },
    duplicateStatus: { type: String, default: "RULE_BASED" },
    summary: { type: String, default: null },
    generatedAt: { type: Date, default: null },

    extracted: {
      trainNumber: { type: String, default: null },
      station: { type: String, default: null },
      coach: { type: String, default: null },
      seat: { type: String, default: null },
    },

    keywords: { type: [String], default: [] },
    processingStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      required: true,
    },
    processingTimeMs: { type: Number, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "ComplaintAiAnalysis",
  complaintAiAnalysisSchema,
);
