// source/services/sla.service.js
// Computes SLA due dates from the priority -> targetMinutes mapping.
// Reads from the SlaRule collection (admin-configurable) with a fallback
// to the hardcoded SLA_TARGET_MINUTES defaults from config/constants.js
// if a rule hasn't been seeded/configured yet.

const SlaRule = require('../models/slaRule.model');
const { SLA_TARGET_MINUTES } = require('../config/constants');

async function getTargetMinutesForPriority(priority) {
  const rule = await SlaRule.findOne({ priority });
  if (rule) return rule.targetMinutes;
  return SLA_TARGET_MINUTES[priority] || SLA_TARGET_MINUTES.MEDIUM;
}

async function computeDueAt(priority, fromDate = new Date()) {
  const targetMinutes = await getTargetMinutesForPriority(priority);
  return new Date(fromDate.getTime() + targetMinutes * 60 * 1000);
}

module.exports = { getTargetMinutesForPriority, computeDueAt };
