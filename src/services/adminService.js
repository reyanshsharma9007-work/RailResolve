import { apiClient } from './apiClient';

export const adminService = {
  getUsers: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/users${query ? `?${query}` : ''}`);
  },

  // POST /admin/users — creates an OFFICER / SENIOR_AUTHORITY / ADMIN.
  // payload: { name, email, password, role, departmentCode?, phone? }
  // departmentCode is REQUIRED when role === 'OFFICER'.
  createUser: (payload) => apiClient.post('/admin/users', payload),

  // The backend validator requires departmentCode alongside role === 'OFFICER',
  // so the whole payload is passed through rather than just the role string.
  updateUserRole: (id, payload) =>
    apiClient.patch(
      `/admin/users/${id}/role`,
      typeof payload === 'string' ? { role: payload } : payload
    ),

  deactivateUser: (id) => apiClient.patch(`/admin/users/${id}/deactivate`, {}),
  activateUser: (id) => apiClient.patch(`/admin/users/${id}/activate`, {}),
  resetUserPassword: (id, password) => apiClient.patch(`/admin/users/${id}/password`, { password }),

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
