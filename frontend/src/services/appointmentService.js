import api from './api';

export const getDepartments = async () => {
  const response = await api.get('/appointments/departments');
  return response.data;
};

export const getAvailableSlots = async (doctorId, date, patientId = null) => {
  const params = { doctor_id: doctorId, date };
  if (patientId) params.patient_id = patientId;
  const response = await api.get('/appointments/available-slots', { params });
  return response.data;
};

export const bookAppointment = async (bookingData) => {
  const response = await api.post('/appointments', bookingData);
  return response.data;
};

export const cancelAppointment = async (id) => {
  const response = await api.post(`/appointments/${id}/cancel`);
  return response.data;
};

export const getAllAppointments = async (params) => {
  const response = await api.get('/appointments', { params });
  return response.data;
};

export const updateAppointmentStatus = async (id, status) => {
  const response = await api.patch(`/appointments/${id}/status`, { status });
  return response.data;
};

export const confirmAppointment = async (id) => {
  const response = await api.patch(`/appointments/${id}/confirm`);
  return response.data;
};

