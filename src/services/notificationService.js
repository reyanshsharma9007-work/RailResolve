import { apiClient } from './apiClient';

export const notificationService = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/notifications${query ? `?${query}` : ''}`);
  },
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
};
