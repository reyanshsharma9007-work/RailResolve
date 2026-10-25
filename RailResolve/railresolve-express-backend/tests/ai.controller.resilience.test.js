jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../source/models/complaint.model', () => ({ find: jest.fn() }));
jest.mock('../source/models/journey.model', () => ({ find: jest.fn() }));
jest.mock('../source/config/env', () => ({
  INTERNAL_SERVICE_TOKEN: 'test-token',
  FASTAPI_URL: 'http://fastapi.test',
  FASTAPI_REQUEST_TIMEOUT_MS: 1000,
}));

const axios = require('axios');
const Complaint = require('../source/models/complaint.model');
const Journey = require('../source/models/journey.model');
const { assistant } = require('../source/controllers/ai.controller');

function queryMock(items = []) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue(items),
  };
}

function invoke(question = 'hello') {
  const req = { user: { _id: 'passenger-1' }, body: { question } };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  return assistant(req, res, next).then(() => ({ req, res, next }));
}

beforeEach(() => {
  jest.clearAllMocks();
  Complaint.find.mockReturnValue(queryMock([]));
  Journey.find.mockReturnValue(queryMock([]));
});

test('normal assistant response is returned safely', async () => {
  axios.post.mockResolvedValue({
    data: { answer: 'Your complaint is submitted.', intent: 'MY_COMPLAINT_STATUS', grounded: true },
  });

  const { res, next } = await invoke('What is my complaint status?');

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test('FastAPI timeout returns safe unavailable response', async () => {
  axios.post.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));

  const { res, next } = await invoke();

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    errorCode: 'AI_SERVICE_UNAVAILABLE',
    message: 'AI Assistant is currently unavailable. Please try again.',
  });
});

test('FastAPI connection failure returns safe unavailable response', async () => {
  axios.post.mockRejectedValue(Object.assign(new Error('connect refused'), { code: 'ECONNREFUSED' }));

  const { res, next } = await invoke();

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AI_SERVICE_UNAVAILABLE' }));
});

test('malformed FastAPI response returns safe unavailable response', async () => {
  axios.post.mockResolvedValue({ data: { success: true, answer: 42 } });

  const { res, next } = await invoke();

  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AI_SERVICE_UNAVAILABLE' }));
});

test('assistant context query is restricted to authenticated passenger', async () => {
  axios.post.mockResolvedValue({ data: { answer: 'ok', intent: 'FAQ', grounded: true } });

  await invoke('How do I report a complaint?');

  expect(Complaint.find).toHaveBeenCalledWith({ passengerId: 'passenger-1' });
  expect(Journey.find).toHaveBeenCalledWith({ passengerId: 'passenger-1' });
});
