import { apiClient } from './apiClient';

export const journeyService = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/journeys${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiClient.get(`/journeys/${id}`),
  create: (data) => apiClient.post('/journeys', data),
};
