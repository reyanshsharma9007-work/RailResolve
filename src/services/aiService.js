import { apiClient } from './apiClient';

export const aiService = {
  analyzePreview: (data) => apiClient.post('/ai/analyze-preview', data),
  assistant: (question) => apiClient.post('/ai/assistant', { question }),
  scanTicket: (file) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/ai/ticket-scan', form);
  },
};
