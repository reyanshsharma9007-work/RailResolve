// source/models/journey.model.js
// A passenger's specific trip record. A complaint is always filed against
// a journey the passenger owns (object-level authorization enforced in
// journey.controller.js and complaint.service.js).

const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Train', required: true },
    pnr: { type: String, trim: true, default: null },
    boardingStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    destinationStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    coach: { type: String, trim: true, default: null },
    seat: { type: String, trim: true, default: null },
    travelDate: { type: Date, required: true },
  },
  { timestamps: true }
);

journeySchema.index({ passengerId: 1, travelDate: -1 });

module.exports = mongoose.model('Journey', journeySchema);
