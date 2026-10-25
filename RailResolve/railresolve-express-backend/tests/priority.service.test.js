const { computeFinalPriority } = require('../source/services/priority.service');

describe('priority safety engine', () => {
  test('AI CRITICAL alone can never become final CRITICAL', () => {
    const result = computeFinalPriority({ title: 'Refund request', description: 'Please refund my ticket', aiRecommendedPriority: 'CRITICAL' });
    expect(result.finalPriority).toBe('MEDIUM');
    expect(result.humanReviewRequired).toBe(true);
    expect(result.prioritySource).toBe('AI_RECOMMENDATION_REJECTED_FOR_CRITICAL');
  });

  test('passenger-submitted priority is not an input to final priority', () => {
    const low = computeFinalPriority({ title: 'Lost item', description: 'My bag is missing', passengerSubmittedPriority: 'CRITICAL' });
    const critical = computeFinalPriority({ title: 'Lost item', description: 'My bag is missing', passengerSubmittedPriority: 'CRITICAL', aiRecommendedPriority: 'LOW' });
    expect(low.finalPriority).toBe('MEDIUM');
    expect(critical.finalPriority).toBe('LOW');
  });

  test('qualifying safety rule can produce final CRITICAL', () => {
    const result = computeFinalPriority({ title: 'Fire in coach', description: 'Smoke and fire reported', aiRecommendedPriority: 'CRITICAL' });
    expect(result.finalPriority).toBe('CRITICAL');
    expect(result.prioritySource).toBe('SAFETY_RULE');
    expect(result.humanReviewRequired).toBe(true);
  });

  test('explicit human escalation can produce final CRITICAL', () => {
    const result = computeFinalPriority({ title: 'Service issue', description: 'Requires senior review', humanEscalationApproved: true });
    expect(result.finalPriority).toBe('CRITICAL');
    expect(result.prioritySource).toBe('HUMAN_ESCALATION');
  });

  test('non-critical AI recommendation remains backend-guarded', () => {
    const result = computeFinalPriority({ title: 'Late train', description: 'The train is delayed', aiRecommendedPriority: 'HIGH' });
    expect(result.finalPriority).toBe('HIGH');
    expect(result.prioritySource).toBe('AI_RECOMMENDATION_RULE_GUARDED');
  });
});
