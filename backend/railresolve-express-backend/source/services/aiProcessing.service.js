// source/services/aiProcessing.service.js
// Client for the internal FastAPI processing microservice. Per the PRD's
// fail-safe pipeline (section 8.1): this call is fire-and-forget from the
// caller's perspective — a timeout or error here must NEVER throw back
// into the complaint creation flow. It always resolves, recording either
// a SUCCESS or FAILED ComplaintAiAnalysis document.

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const ComplaintAiAnalysis = require('../models/complaintAiAnalysis.model');

/**
 * Sends complaint text to FastAPI for LLM analysis and persists the
 * result. Runs asynchronously after the HTTP response to the passenger
 * has already been sent (see complaint.controller.js) so it can never
 * delay complaint creation.
 */
async function requestComplaintAnalysis(complaint) {
  const startedAt = Date.now();

  try {
    // The complaint document stores trainId (an ObjectId), not trainNumber.
    // Resolve it here so the model receives the real number as context
    // instead of always null.
    let trainNumber = null;
    try {
      if (complaint.trainId) {
        await complaint.populate('trainId', 'trainNumber trainName');
        trainNumber = complaint.trainId?.trainNumber || null;
      }
    } catch (populateErr) {
      logger.warn(`Could not resolve train number for complaint ${complaint._id}: ${populateErr.message}`);
    }

    const response = await axios.post(
      `${env.FASTAPI_URL}/internal/complaints/process`,
      {
        complaintId: String(complaint._id),
        title: complaint.title,
        description: complaint.description,
        trainNumber,
        coach: complaint.coach || null,
        seat: complaint.seat || null,
      },
      {
        headers: {
          Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: env.FASTAPI_REQUEST_TIMEOUT_MS,
      }
    );

    // FastAPI's fail-safe contract returns HTTP 200 even when the LLM
    // call failed (success: false, analysis: null) — it never throws a
    // non-2xx for an AI failure. So a 2xx response here does NOT
    // guarantee `analysis` is populated; we must check `success`
    // ourselves before trusting its shape.
    const { success, analysis, model: modelUsed } = response.data;

    if (!success || !analysis) {
      await ComplaintAiAnalysis.findOneAndUpdate(
        { complaintId: complaint._id },
        {
          complaintId: complaint._id,
          processingStatus: 'FAILED',
          processingTimeMs: Date.now() - startedAt,
          failureReason: response.data.message || response.data.errorCode || 'AI analysis unavailable',
        },
        { upsert: true, new: true }
      );

      logger.warn(`AI analysis unavailable for complaint ${complaint._id}: ${response.data.errorCode || 'unknown reason'}`);
      return;
    }

    await ComplaintAiAnalysis.findOneAndUpdate(
      { complaintId: complaint._id },
      {
        complaintId: complaint._id,
        model: modelUsed || null,
        summary: analysis.summary,
        issueType: analysis.issueType,
        extracted: {
          trainNumber: analysis.trainNumber ?? null,
          station: analysis.station ?? null,
          coach: analysis.coach ?? null,
          seat: analysis.seat ?? null,
        },
        keywords: analysis.keywords || [],
        processingStatus: 'SUCCESS',
        processingTimeMs: Date.now() - startedAt,
      },
      { upsert: true, new: true }
    );

    logger.info(`AI analysis succeeded for complaint ${complaint._id}`);

  } catch (err) {
    // Decoupled failure: log server-side, persist a FAILED record the UI
    // can render as "AI Analysis Unavailable," and stop. The core
    // complaint workflow is completely unaffected by this branch.
    logger.warn(`AI analysis failed for complaint ${complaint._id}: ${err.message}`);

    await ComplaintAiAnalysis.findOneAndUpdate(
      { complaintId: complaint._id },
      {
        complaintId: complaint._id,
        processingStatus: 'FAILED',
        processingTimeMs: Date.now() - startedAt,
        failureReason: err.code === 'ECONNABORTED' ? 'TIMEOUT' : err.message,
      },
      { upsert: true, new: true }
    ).catch((persistErr) => {
      logger.error(`Failed to persist FAILED analysis record for complaint ${complaint._id}: ${persistErr.message}`);
    });
  }
}

module.exports = { requestComplaintAnalysis };
