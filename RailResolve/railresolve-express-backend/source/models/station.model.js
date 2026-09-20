// source/models/station.model.js
// Simulated station master data used for journey/complaint context
// (boarding station, incident station), seeded from demo data.

const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Station', stationSchema);
