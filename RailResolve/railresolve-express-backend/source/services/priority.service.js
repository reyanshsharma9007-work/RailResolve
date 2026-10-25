const { PRIORITY } = require('../config/constants');

const RULES = [
  { priority: PRIORITY.CRITICAL, terms: ['fire', 'smoke', 'explosion', 'bomb', 'major injury', 'unconscious', 'medical emergency', 'weapon'] },
  { priority: PRIORITY.HIGH, terms: ['unsafe', 'security', 'harassment', 'theft', 'injury', 'accident', 'electrical hazard', 'door open', 'brake failure', 'serious delay'] },
];

/**
 * Backend-owned final-priority policy.
 * Passenger input is deliberately absent from this function: it is recorded
 * for audit/display only and can never determine SLA priority.
 * AI may recommend CRITICAL, but only a qualifying backend safety rule (or a
 * future explicit human escalation approval) may produce final CRITICAL.
 */
function computeFinalPriority({ title = '', description = '', aiRecommendedPriority = null, humanEscalationApproved = false }) {
  const text = `${title} ${description}`.toLowerCase();

  for (const rule of RULES) {
    const matches = rule.terms.filter((term) => text.includes(term));
    if (matches.length) {
      return {
        finalPriority: rule.priority,
        prioritySource: 'SAFETY_RULE',
        priorityOverrideReason: `Matched safety indicator(s): ${matches.join(', ')}`,
        humanReviewRequired: rule.priority === PRIORITY.CRITICAL,
      };
    }
  }

  if (humanEscalationApproved) {
    return {
      finalPriority: PRIORITY.CRITICAL,
      prioritySource: 'HUMAN_ESCALATION',
      priorityOverrideReason: 'Explicit human escalation approved CRITICAL handling.',
      humanReviewRequired: false,
    };
  }

  // AI CRITICAL is intentionally downgraded when no backend safety rule or
  // explicit human escalation qualifies it. It cannot shorten the SLA.
  if (aiRecommendedPriority === PRIORITY.CRITICAL) {
    return {
      finalPriority: PRIORITY.MEDIUM,
      prioritySource: 'AI_RECOMMENDATION_REJECTED_FOR_CRITICAL',
      priorityOverrideReason: 'AI recommended CRITICAL without a qualifying backend safety rule or human escalation.',
      humanReviewRequired: true,
    };
  }

  if ([PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH].includes(aiRecommendedPriority)) {
    return {
      finalPriority: aiRecommendedPriority,
      prioritySource: 'AI_RECOMMENDATION_RULE_GUARDED',
      priorityOverrideReason: null,
      humanReviewRequired: false,
    };
  }

  return { finalPriority: PRIORITY.MEDIUM, prioritySource: 'DEFAULT', priorityOverrideReason: null, humanReviewRequired: false };
}

module.exports = { computeFinalPriority };
