// source/validators/journey.validator.js
// Field-level validation for journey creation payloads.

const mongoose = require('mongoose');

function validateCreateJourneyPayload(body) {
  const errors = [];
  const { trainId, boardingStationId, destinationStationId, travelDate, pnr, coach, seat } = body;

  if (!trainId || !mongoose.Types.ObjectId.isValid(trainId)) {
    errors.push('A valid trainId is required');
  }
  if (!boardingStationId || !mongoose.Types.ObjectId.isValid(boardingStationId)) {
    errors.push('A valid boardingStationId is required');
  }
  if (!destinationStationId || !mongoose.Types.ObjectId.isValid(destinationStationId)) {
    errors.push('A valid destinationStationId is required');
  }
  if (
    boardingStationId &&
    destinationStationId &&
    mongoose.Types.ObjectId.isValid(boardingStationId) &&
    mongoose.Types.ObjectId.isValid(destinationStationId) &&
    String(boardingStationId) === String(destinationStationId)
  ) {
    errors.push('boardingStationId and destinationStationId must be different');
  }
  if (!travelDate || isNaN(Date.parse(travelDate))) {
    errors.push('A valid travelDate is required');
  }
  if (pnr !== undefined && pnr !== null && typeof pnr !== 'string') {
    errors.push('pnr must be a string');
  }
  if (coach !== undefined && coach !== null && typeof coach !== 'string') {
    errors.push('coach must be a string');
  }
  if (seat !== undefined && seat !== null && typeof seat !== 'string') {
    errors.push('seat must be a string');
  }

  return errors;
}

module.exports = { validateCreateJourneyPayload };
