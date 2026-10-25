// Jest integration-style unit test. It is included for environments with the
// complete npm dependency tree; the current review environment lacks npm
// dependencies, so this file was not executed here.
jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../source/models/complaint.model', () => ({ find: jest.fn() }));
jest.mock('../source/models/complaintAiAnalysis.model', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../source/services/sla.service', () => ({ computeDueAt: jest.fn().mockResolvedValue(new Date()) }));

const axios = require('axios');
const ComplaintAiAnalysis = require('../source/models/complaintAiAnalysis.model');
const { requestComplaintAnalysis } = require('../source/services/aiProcessing.service');

beforeEach(() => jest.clearAllMocks());

test('AI unavailable is recorded as FAILED and does not throw', async () => {
  ComplaintAiAnalysis.findOneAndUpdate.mockResolvedValue({});
  axios.post.mockRejectedValue(Object.assign(new Error('connect refused'), { code: 'ECONNREFUSED' }));
  const result = await requestComplaintAnalysis({ _id: '507f1f77bcf86cd799439011', title: 'Delay', description: 'Train is late' });
  expect(result.status).toBe('FAILED');
  expect(ComplaintAiAnalysis.findOneAndUpdate).toHaveBeenCalledTimes(2);
  expect(ComplaintAiAnalysis.findOneAndUpdate.mock.calls[0][1].processingStatus).toBe('PENDING');
  expect(ComplaintAiAnalysis.findOneAndUpdate.mock.calls[1][1].processingStatus).toBe('FAILED');
});


test('AI timeout is recorded as FAILED without throwing', async () => {
  ComplaintAiAnalysis.findOneAndUpdate.mockResolvedValue({});
  axios.post.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));
  const result = await requestComplaintAnalysis({ _id: '507f1f77bcf86cd799439012', title: 'Delay', description: 'Train is late' });
  expect(result.status).toBe('FAILED');
  expect(ComplaintAiAnalysis.findOneAndUpdate.mock.calls[1][1].failureReason).toBe('TIMEOUT');
});

test('malformed AI analysis response is recorded as FAILED without throwing', async () => {
  ComplaintAiAnalysis.findOneAndUpdate.mockResolvedValue({});
  axios.post.mockResolvedValue({ data: { success: true, analysis: null } });
  const result = await requestComplaintAnalysis({ _id: '507f1f77bcf86cd799439013', title: 'Delay', description: 'Train is late' });
  expect(result.status).toBe('FAILED');
  expect(ComplaintAiAnalysis.findOneAndUpdate.mock.calls[1][1].failureReason).toBe('AI analysis unavailable');
});
