import { apiClient } from './apiClient';

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  me: () => apiClient.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
  }
};
