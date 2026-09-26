import api from './api';

export const sendChatMessage = async (message, context = {}) => {
  const response = await api.post('/chatbot/message', { message, ...context });
  return response.data;
};

export const trackPatientStatus = async (appointmentId = null) => {
  const url = appointmentId ? `/chatbot/track/${appointmentId}` : '/chatbot/track';
  const response = await api.get(url);
  return response.data;
};
