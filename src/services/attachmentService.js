import { apiClient } from './apiClient';

export const attachmentService = {
  upload: (complaintId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/complaints/${complaintId}/attachments`, formData);
  },
  getByComplaint: (complaintId) => apiClient.get(`/complaints/${complaintId}/attachments`),
  // GET /api/attachments/:id streams raw bytes, not JSON.
  getById: (id) => apiClient.get(`/attachments/${id}`, { responseType: 'blob' }),
  // Convenience: returns an object URL the browser can open in a new tab.
  openInNewTab: async (id) => {
    const blob = await apiClient.get(`/attachments/${id}`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
