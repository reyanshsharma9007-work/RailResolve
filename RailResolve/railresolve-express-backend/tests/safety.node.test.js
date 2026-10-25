const test = require('node:test');
const assert = require('node:assert/strict');
const { computeFinalPriority } = require('../source/services/priority.service');

// These tests use only Node's built-in runner, so they remain executable even
// when the full npm dependency tree is unavailable in the review environment.
test('AI CRITICAL alone cannot shorten SLA to CRITICAL', () => {
  const result = computeFinalPriority({ title: 'Refund', description: 'Refund only', aiRecommendedPriority: 'CRITICAL' });
  assert.equal(result.finalPriority, 'MEDIUM');
});

test('passenger submitted CRITICAL is ignored by final-priority policy', () => {
  const result = computeFinalPriority({ title: 'Routine issue', description: 'General complaint', passengerSubmittedPriority: 'CRITICAL' });
  assert.equal(result.finalPriority, 'MEDIUM');
});

test('qualifying safety rule produces CRITICAL', () => {
  const result = computeFinalPriority({ title: 'Fire', description: 'Smoke in coach' });
  assert.equal(result.finalPriority, 'CRITICAL');
});

test('explicit human escalation produces CRITICAL', () => {
  const result = computeFinalPriority({ title: 'Service issue', description: 'Senior review required', humanEscalationApproved: true });
  assert.equal(result.finalPriority, 'CRITICAL');
  assert.equal(result.prioritySource, 'HUMAN_ESCALATION');
});

test('AI LOW/MEDIUM/HIGH recommendations remain within allowed non-critical range', () => {
  assert.equal(computeFinalPriority({ title: 'Routine', description: 'Routine issue', aiRecommendedPriority: 'LOW' }).finalPriority, 'LOW');
  assert.equal(computeFinalPriority({ title: 'Routine', description: 'Routine issue', aiRecommendedPriority: 'MEDIUM' }).finalPriority, 'MEDIUM');
  assert.equal(computeFinalPriority({ title: 'Late train', description: 'The train is delayed', aiRecommendedPriority: 'HIGH' }).finalPriority, 'HIGH');
});
