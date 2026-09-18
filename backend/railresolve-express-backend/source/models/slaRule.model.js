// source/models/slaRule.model.js
// Configurable SLA duration per priority. Seeded with the demo values
// from the spec (LOW=4h, MEDIUM=1h, HIGH=30m, CRITICAL=15m) but editable
// by admins via /api/admin/sla-rules without a code change.

const mongoose = require('mongoose');
const { PRIORITY_VALUES } = require('../config/constants');

const slaRuleSchema = new mongoose.Schema(
  {
    priority: { type: String, enum: PRIORITY_VALUES, required: true, unique: true },
    targetMinutes: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SlaRule', slaRuleSchema);
