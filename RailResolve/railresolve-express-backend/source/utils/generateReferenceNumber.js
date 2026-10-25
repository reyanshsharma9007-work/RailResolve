// source/utils/generateReferenceNumber.js
// Generates human-readable complaint reference numbers like RR-2026-000123.
// Uses an atomic MongoDB counter document so numbers stay sequential and
// collision-free even under concurrent complaint creation.

const Counter = require('../models/counter.model');

async function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const counterKey = `complaint_ref_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(6, '0');
  return `RR-${year}-${padded}`;
}

module.exports = generateReferenceNumber;
