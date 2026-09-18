// source/models/train.model.js
// Simulated train master data (per PRD 2.2, no live IRCTC integration —
// this is seed/demo data used to populate journey and complaint forms).

const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema(
  {
    trainNumber: { type: String, required: true, unique: true, trim: true },
    trainName: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Train', trainSchema);
