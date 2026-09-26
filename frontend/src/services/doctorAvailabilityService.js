import api from './api';

// Fetch doctor availability entries
export const getDoctorAvailability = async (doctorId, params = {}) => {
  const response = await api.get(`/doctors/${doctorId}/availability`, { params });
  return response.data;
};

// Add a doctor unavailability entry (Doctor or Admin)
export const addDoctorAvailability = async (doctorId, availabilityData) => {
  const response = await api.post(`/doctors/${doctorId}/availability`, availabilityData);
  return response.data;
};

// Remove/undo an unavailability entry (Doctor or Admin)
export const deleteDoctorAvailability = async (doctorId, availabilityId) => {
  const response = await api.delete(`/doctors/${doctorId}/availability/${availabilityId}`);
  return response.data;
};
