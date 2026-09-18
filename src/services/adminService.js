import { apiClient } from './apiClient';

export const adminService = {
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/users${query ? `?${query}` : ''}`);
  },
  updateUserRole: (id, role) => apiClient.patch(`/admin/users/${id}/role`, { role }),
  deactivateUser: (id) => apiClient.patch(`/admin/users/${id}/deactivate`),
  
  getAuditLogs: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  
  getAnalytics: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/analytics${query ? `?${query}` : ''}`);
  },
  
  getDepartments: () => apiClient.get('/admin/departments'),
  updateDepartment: (id, data) => apiClient.patch(`/admin/departments/${id}`, data),
  
  getSlaRules: () => apiClient.get('/admin/sla-rules'),
  updateSlaRules: (data) => apiClient.put('/admin/sla-rules', data),
};
