import api from './api';

// Doctor applies for leave
export const applyDoctorLeave = async (leaveData) => {
  const response = await api.post('/doctors/portal/leaves', leaveData);
  return response.data;
};

// Doctor gets their own leaves
export const getMyLeaves = async () => {
  const response = await api.get('/doctors/portal/leaves');
  return response.data;
};

// Admin gets all leaves
export const getAllDoctorLeaves = async () => {
  const response = await api.get('/doctors/leaves/all');
  return response.data;
};

// Admin approves a leave
export const approveDoctorLeave = async (leaveId) => {
  const response = await api.put(`/doctors/leaves/${leaveId}/approve`);
  return response.data;
};

// Admin rejects a leave
export const rejectDoctorLeave = async (leaveId) => {
  const response = await api.put(`/doctors/leaves/${leaveId}/reject`);
  return response.data;
};

// Admin applies leave on behalf of doctor
export const adminApplyDoctorLeave = async (leaveData) => {
  const response = await api.post('/doctors/leaves/admin-apply', leaveData);
  return response.data;
};
