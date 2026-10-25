const axios = require("axios");
const env = require("../config/env");
const logger = require("../utils/logger");
const Complaint = require("../models/complaint.model");
const ComplaintAiAnalysis = require("../models/complaintAiAnalysis.model");
const { computeFinalPriority } = require("./priority.service");
const { computeDueAt } = require("./sla.service");

async function markAiFailure(complaintId, startedAt, reason) {
  await ComplaintAiAnalysis.findOneAndUpdate(
    { complaintId },
    {
      $set: {
        complaintId,
        processingStatus: "FAILED",
        processingTimeMs: Date.now() - startedAt,
        failureReason: reason,
      },
    },
    { upsert: true, new: true },
  ).catch(() => {});
}

// Model 2 is advisory-only. It must never determine final priority or SLA.
async function requestPriorityModel2(title, description) {
  try {
    const response = await axios.post(
      `${env.FASTAPI_URL}/internal/ai/predict-priority`,
      { title, description },
      {
        headers: {
          Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: env.FASTAPI_REQUEST_TIMEOUT_MS,
      },
    );

    const data = response.data;

    if (
      !data ||
      !["low", "medium", "high"].includes(data.predictedUrgency) ||
      data.advisoryOnly !== true
    ) {
      throw new Error("Invalid Model 2 response");
    }

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH"];

    return {
      modelVersion: data.modelVersion || null,
      predictedUrgency: data.predictedUrgency,
      recommendedPriority: allowedPriorities.includes(data.recommendedPriority)
        ? data.recommendedPriority
        : null,
      confidence: data.confidence ?? null,
      probabilities: {
        low: data.probabilities?.low ?? null,
        medium: data.probabilities?.medium ?? null,
        high: data.probabilities?.high ?? null,
      },
      advisoryOnly: true,
      lowCoverage: data.lowCoverage ?? null,
      vocabularyCoverage: data.vocabularyCoverage ?? null,
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      status: "SUCCESS",
    };
  } catch (err) {
    logger.warn(`Model 2 advisory prediction unavailable: ${err.message}`);

    return {
      advisoryOnly: true,
      status: "UNAVAILABLE",
      warnings: ["Priority model advisory prediction unavailable"],
    };
  }
}

async function requestComplaintAnalysis(complaint) {
  const startedAt = Date.now();

  try {
    await ComplaintAiAnalysis.findOneAndUpdate(
      { complaintId: complaint._id },
      {
        $set: {
          complaintId: complaint._id,
          processingStatus: "PENDING",
          failureReason: null,
          processingTimeMs: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    let trainNumber = null;

    try {
      if (complaint.trainId) {
        await complaint.populate([
          { path: "trainId", select: "trainNumber trainName" },
          { path: "departmentId", select: "code" },
        ]);

        trainNumber = complaint.trainId?.trainNumber || null;
      }
    } catch (err) {
      logger.warn(`Could not resolve train number: ${err.message}`);
    }

    const candidates = await Complaint.find({
      _id: { $ne: complaint._id },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("_id title description");

    // Existing AI analysis remains unchanged.
    const response = await axios.post(
      `${env.FASTAPI_URL}/internal/ai/analyze`,
      {
        complaintId: String(complaint._id),
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        department: complaint.departmentId?.code || null,
        trainNumber,
        coach: complaint.coach || null,
        seat: complaint.seat || null,
        candidates: candidates.map((c) => ({
          complaintId: String(c._id),
          text: `${c.title}. ${c.description}`,
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: env.FASTAPI_REQUEST_TIMEOUT_MS,
      },
    );

    const { success, analysis } = response.data || {};

    if (!success || !analysis) {
      await markAiFailure(
        complaint._id,
        startedAt,
        response.data?.message || "AI analysis unavailable",
      );

      return { status: "FAILED" };
    }

    // Run Model 2 independently. Its failure must not fail the main analysis.
    const priorityModel2 = await requestPriorityModel2(
      complaint.title,
      complaint.description,
    );

    // Existing authoritative priority calculation is preserved.
    // Model 2 is deliberately NOT passed into this function.
    const priorityDecision = computeFinalPriority({
      title: complaint.title,
      description: complaint.description,
      aiRecommendedPriority: analysis.priority?.recommendedPriority || null,
    });

    const complaintUpdate = {
      aiRecommendedPriority: analysis.priority?.recommendedPriority || null,
      priorityHumanReviewRequired:
        priorityDecision.humanReviewRequired ||
        Boolean(analysis.priority?.humanReviewRequired),
    };

    // Recalculate SLA only when the authoritative final priority changes.
    if (complaint.finalPriority !== priorityDecision.finalPriority) {
      complaintUpdate.finalPriority = priorityDecision.finalPriority;
      complaintUpdate.priority = priorityDecision.finalPriority;
      complaintUpdate.prioritySource = priorityDecision.prioritySource;
      complaintUpdate.priorityOverrideReason =
        priorityDecision.priorityOverrideReason;
      complaintUpdate["sla.dueAt"] = await computeDueAt(
        priorityDecision.finalPriority,
      );
    }

    await Complaint.findByIdAndUpdate(complaint._id, { $set: complaintUpdate });

    await ComplaintAiAnalysis.findOneAndUpdate(
      { complaintId: complaint._id },
      {
        $set: {
          complaintId: complaint._id,
          model: analysis.modelVersion || "railresolve-rules-1.1.0",
          modelVersion: analysis.modelVersion || "railresolve-rules-1.1.0",

          issueType: analysis.classification?.category || null,
          category: analysis.classification?.category || null,
          subcategory: analysis.classification?.subcategory || null,
          department: analysis.classification?.department || null,
          categoryConfidence: analysis.classification?.confidence ?? 0,
          categoryStatus: analysis.classification?.status || "RULE_BASED",
          categoryReason: analysis.classification?.reason || null,

          aiRecommendedPriority: analysis.priority?.recommendedPriority || null,
          finalPriority: priorityDecision.finalPriority,
          finalPrioritySource: priorityDecision.prioritySource,
          finalPriorityReason: priorityDecision.priorityOverrideReason,
          priorityConfidence: analysis.priority?.confidence ?? 0,
          priorityStatus: analysis.priority?.status || "RULE_BASED",
          priorityReasons: analysis.priority?.reasons || [],

          // Separate Model 2 result; never controls final priority or SLA.
          priorityModel2,

          humanReviewRequired:
            priorityDecision.humanReviewRequired ||
            Boolean(analysis.priority?.humanReviewRequired) ||
            analysis.classification?.status === "HUMAN_REVIEW_REQUIRED",

          isDuplicate: Boolean(analysis.duplicate?.isDuplicate),
          duplicateOf: analysis.duplicate?.duplicateOf || null,
          duplicateSimilarity: analysis.duplicate?.similarity ?? 0,
          duplicateStatus: analysis.duplicate?.status || "RULE_BASED_BASELINE",

          summary: analysis.summary || null,
          generatedAt: analysis.generatedAt || new Date(),
          processingStatus: "SUCCESS",
          processingTimeMs: Date.now() - startedAt,
          failureReason: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      status: "SUCCESS",
      priorityModel2Status: priorityModel2.status,
    };
  } catch (err) {
    logger.warn(
      `AI analysis failed for complaint ${complaint._id}: ${err.message}`,
    );

    await markAiFailure(
      complaint._id,
      startedAt,
      err.code === "ECONNABORTED" ? "TIMEOUT" : "AI_SERVICE_UNAVAILABLE",
    );

    return { status: "FAILED" };
  }
}

module.exports = { requestComplaintAnalysis };
