import { apiClient } from './apiClient';

export const complaintService = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/complaints${query ? `?${query}` : ''}`);
  },
  getById: (id) => apiClient.get(`/complaints/${id}`),
  create: (data) => apiClient.post('/complaints', data),
  // Backend expects { message, isInfoRequest } — see complaint.validator.js
  addComment: (id, payload) =>
    apiClient.post(
      `/complaints/${id}/comments`,
      typeof payload === 'string' ? { message: payload, isInfoRequest: false } : payload
    ),
  
  // Status actions
  updateStatus: (id, payload) => apiClient.patch(`/complaints/${id}/status`, payload),
  assign: (id, data) => apiClient.post(`/complaints/${id}/assign`, data),
  escalate: (id, data) => apiClient.post(`/complaints/${id}/escalate`, data),
  resolve: (id, data) => apiClient.post(`/complaints/${id}/resolve`, data),
  close: (id, data) => apiClient.post(`/complaints/${id}/close`, data),
};
