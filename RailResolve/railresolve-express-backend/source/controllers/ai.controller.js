const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const env = require('../config/env');
const Complaint = require('../models/complaint.model');
const Journey = require('../models/journey.model');
const AppError = require('../utils/AppError');

const headers = () => ({ Authorization: `Bearer ${env.INTERNAL_SERVICE_TOKEN}` });

const AI_UNAVAILABLE = {
  statusCode: 503,
  message: 'AI Assistant is currently unavailable. Please try again.',
  errorCode: 'AI_SERVICE_UNAVAILABLE',
};

const assistant = catchAsync(async (req, res) => {
  const complaints = await Complaint.find({ passengerId: req.user._id })
    .sort({ createdAt: -1 }).limit(10).select('referenceNumber status finalPriority category createdAt');
  const journeys = await Journey.find({ passengerId: req.user._id })
    .sort({ travelDate: -1 }).limit(10).select('travelDate coach seat trainId boardingStationId destinationStationId');

  try {
    const response = await axios.post(`${env.FASTAPI_URL}/internal/ai/assistant`, {
      question: req.body.question,
      context: {
        complaints: complaints.map(c => ({
          referenceNumber: c.referenceNumber, status: c.status, finalPriority: c.finalPriority,
          category: c.category, createdAt: c.createdAt,
        })),
        journeys: journeys.map(j => ({
          travelDate: j.travelDate, coach: j.coach, seat: j.seat,
          trainId: j.trainId, boardingStationId: j.boardingStationId, destinationStationId: j.destinationStationId,
        })),
      },
    }, { headers: { ...headers(), 'Content-Type': 'application/json' }, timeout: env.FASTAPI_REQUEST_TIMEOUT_MS });

    const data = response.data;
    if (!data || typeof data.answer !== 'string' || typeof data.intent !== 'string') {
      throw new Error('MALFORMED_AI_RESPONSE');
    }

    res.status(200).json({ success: true, message: 'Assistant response generated', data });
  } catch (err) {
    // Deliberately collapse timeout, connection, 5xx, and malformed provider
    // responses into one safe client-facing contract.
    res.status(AI_UNAVAILABLE.statusCode).json({
      success: false,
      errorCode: AI_UNAVAILABLE.errorCode,
      message: AI_UNAVAILABLE.message,
    });
  }
});

const ticketScan = catchAsync(async (req, res) => {
  const { validateTicketUpload } = require('../services/ticket-upload.service');
  validateTicketUpload(req.file, { maxImageBytes: env.MAX_IMAGE_SIZE_BYTES, maxDocumentBytes: env.MAX_DOCUMENT_SIZE_BYTES });
  const form = new FormData();
  form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(env.FASTAPI_REQUEST_TIMEOUT_MS, 30000));
  try {
    const response = await fetch(`${env.FASTAPI_URL}/internal/ai/ticket-scan`, {
      method: 'POST',
      headers: headers(),
      body: form,
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw AppError.serviceUnavailable('Ticket scanner is currently unavailable. Please try again.', 'TICKET_SCAN_UNAVAILABLE');
    }
    if (!response.ok) {
      throw AppError.serviceUnavailable(
        'Ticket scanner is currently unavailable. Please try again.',
        'TICKET_SCAN_UNAVAILABLE'
      );
    }
    res.status(200).json({ success: true, message: 'Ticket scanned; review extracted fields before saving', data });
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      throw AppError.serviceUnavailable('Ticket scanner is currently unavailable. Please try again.', 'TICKET_SCAN_UNAVAILABLE');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
});

const analyzePreview = catchAsync(async (req, res) => {
  const { title, description, category, department } = req.body || {};
  if (!title || !description) throw AppError.badRequest('title and description are required');
  try {
    const response = await axios.post(`${env.FASTAPI_URL}/internal/ai/analyze`, {
      complaintId: `preview-${req.user._id}`,
      title, description, category: category || null, department: department || null, candidates: [],
    }, { headers: { ...headers(), 'Content-Type': 'application/json' }, timeout: env.FASTAPI_REQUEST_TIMEOUT_MS });

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('MALFORMED_AI_RESPONSE');
    }
    res.status(200).json({ success: true, message: 'AI suggestion generated', data: response.data });
  } catch {
    res.status(503).json({
      success: false,
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI service is currently unavailable. Please try again.',
    });
  }
});
module.exports = { assistant, ticketScan, analyzePreview };
