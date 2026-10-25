import { apiClient } from './apiClient';

export const referenceService = {
  getTrains: () => apiClient.get('/reference/trains'),
  getStations: () => apiClient.get('/reference/stations'),
  getDepartments: () => apiClient.get('/reference/departments'),
};
