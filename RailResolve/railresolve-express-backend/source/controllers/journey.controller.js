// source/controllers/journey.controller.js
// HTTP layer for journey records. Journeys are created and listed only
// by/for the owning passenger; there is no cross-passenger journey read.

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const validateRequest = require('../utils/validateRequest');
const { validateCreateJourneyPayload } = require('../validators/journey.validator');
const Journey = require('../models/journey.model');
const Train = require('../models/train.model');
const Station = require('../models/station.model');

const createJourney = catchAsync(async (req, res) => {
  validateRequest(validateCreateJourneyPayload(req.body));

  const { trainId, boardingStationId, destinationStationId, travelDate, pnr, coach, seat } = req.body;

  const [train, boardingStation, destinationStation] = await Promise.all([
    Train.findById(trainId),
    Station.findById(boardingStationId),
    Station.findById(destinationStationId),
  ]);

  if (!train) throw AppError.badRequest('Train not found', 'TRAIN_NOT_FOUND');
  if (!boardingStation) throw AppError.badRequest('Boarding station not found', 'STATION_NOT_FOUND');
  if (!destinationStation) throw AppError.badRequest('Destination station not found', 'STATION_NOT_FOUND');

  const journey = await Journey.create({
    passengerId: req.user._id,
    trainId,
    boardingStationId,
    destinationStationId,
    travelDate,
    pnr: pnr || null,
    coach: coach || null,
    seat: seat || null,
  });

  sendSuccess(res, { statusCode: 201, message: 'Journey created successfully', data: { journey } });
});

const listMyJourneys = catchAsync(async (req, res) => {
  const journeys = await Journey.find({ passengerId: req.user._id })
    .populate('trainId', 'trainNumber trainName')
    .populate('boardingStationId', 'code name')
    .populate('destinationStationId', 'code name')
    .sort({ travelDate: -1 });

  sendSuccess(res, { statusCode: 200, message: 'Journeys retrieved successfully', data: { journeys } });
});

const getJourneyById = catchAsync(async (req, res) => {
  const journey = await Journey.findById(req.params.id)
    .populate('trainId', 'trainNumber trainName')
    .populate('boardingStationId', 'code name')
    .populate('destinationStationId', 'code name');

  if (!journey) throw AppError.notFound('Journey not found');

  if (String(journey.passengerId) !== String(req.user._id)) {
    throw AppError.forbidden('You are not authorized to view this journey');
  }

  sendSuccess(res, { statusCode: 200, message: 'Journey retrieved successfully', data: { journey } });
});

module.exports = { createJourney, listMyJourneys, getJourneyById };
