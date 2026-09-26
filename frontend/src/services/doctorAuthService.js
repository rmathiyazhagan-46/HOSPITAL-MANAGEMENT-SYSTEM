import api from './api';

export const doctorLogin = async (employee_id, password) => {
  const payload = typeof employee_id === 'object'
    ? employee_id
    : { employee_id, password };
  const response = await api.post('/auth/doctor/login', payload);
  return response.data;
};

export const getDoctorProfile = async () => {
  const response = await api.get('/auth/doctor/me');
  return response.data;
};

export const changeDoctorPassword = async (data) => {
  const response = await api.patch('/auth/doctor/me/change-password', data);
  return response.data;
};

export const getDoctorAppointmentsQueue = async (params) => {
  const response = await api.get('/doctors/portal/appointments', { params });
  return response.data;
};

export const submitConsultationAndPrescription = async (data) => {
  const response = await api.post('/doctors/portal/consultation', data);
  return response.data;
};

export const getPatientHistory = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/records`);
  return response.data;
};
