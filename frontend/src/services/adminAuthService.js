import api from './api';

export const adminLogin = async (hospital_name, email, password) => {
  const payload = typeof hospital_name === 'object'
    ? hospital_name
    : { hospital_name, email, password };
  const response = await api.post('/auth/admin/login', payload);
  return response.data;
};

export const getAdminProfile = async () => {
  const response = await api.get('/auth/admin/me');
  return response.data;
};

export const changeAdminPassword = async (data) => {
  const response = await api.patch('/auth/admin/me/change-password', data);
  return response.data;
};


export const getDoctorsList = async (params) => {
  const response = await api.get('/doctors', { params });
  return response.data;
};

export const createDoctorAccount = async (doctorData) => {
  const response = await api.post('/doctors', doctorData);
  return response.data;
};

export const updateDoctorAccount = async (id, doctorData) => {
  const response = await api.put(`/doctors/${id}`, doctorData);
  return response.data;
};

export const deleteDoctorAccount = async (id) => {
  const response = await api.delete(`/doctors/${id}`);
  return response.data;
};

export const getAllPatientsList = async (params) => {
  const response = await api.get('/patients', { params });
  return response.data;
};

export const updatePatientAccount = async (id, patientData) => {
  const response = await api.put(`/patients/${id}`, patientData);
  return response.data;
};

export const deletePatientAccount = async (id) => {
  const response = await api.delete(`/patients/${id}`);
  return response.data;
};

export const getAllInvoicesList = async (params) => {
  const response = await api.get('/billing/invoices', { params });
  return response.data;
};

export const getRevenueStats = async (params) => {
  const response = await api.get('/billing/revenue', { params });
  return response.data;
};

export const getPharmacyInventory = async () => {
  const response = await api.get('/pharmacy/inventory');
  return response.data;
};

export const addPharmacyMedicine = async (medData) => {
  const response = await api.post('/pharmacy/medicines', medData);
  return response.data;
};

export const updatePharmacyMedicine = async (id, medData) => {
  const response = await api.put(`/pharmacy/medicines/${id}`, medData);
  return response.data;
};

export const deletePharmacyMedicine = async (id) => {
  const response = await api.delete(`/pharmacy/medicines/${id}`);
  return response.data;
};

export const updatePharmacyStock = async (stockData) => {
  const response = await api.post('/pharmacy/stock', stockData);
  return response.data;
};

export const deletePharmacyStockBatch = async (batchId) => {
  const response = await api.delete(`/pharmacy/stock/${batchId}`);
  return response.data;
};

// Billing & Revenue: UPI QR Manual Verification APIs
export const getPendingVerificationInvoices = async () => {
  const response = await api.get('/billing/pending-verification');
  return response.data;
};

export const confirmInvoicePayment = async (invoiceId) => {
  const response = await api.post(`/billing/invoice/${invoiceId}/confirm-payment`);
  return response.data;
};

export const rejectInvoicePayment = async (invoiceId, reason) => {
  const response = await api.post(`/billing/invoice/${invoiceId}/reject-payment`, { reason });
  return response.data;
};

export const downloadAdminInvoicePdf = async (invoiceId) => {
  try {
    const response = await api.get(`/billing/invoice/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', `Hospital_Invoice_${invoiceId.toString().padStart(6, '0')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(fileUrl), 10000);
  } catch (err) {
    console.error('Failed to download admin invoice PDF via blob:', err);
    const token = localStorage.getItem('hms_admin_token');
    const url = `${api.defaults.baseURL}/billing/invoice/${invoiceId}/pdf?token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank');
  }
};

