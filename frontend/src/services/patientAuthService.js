import api from './api';

export const registerPatient = async (patientData) => {
  const response = await api.post('/auth/patient/register', patientData);
  return response.data;
};

export const patientLogin = async (patient_id, name, dob) => {
  const payload = typeof patient_id === 'object'
    ? patient_id
    : { patient_id, name, dob };
  const response = await api.post('/auth/patient/login', payload);
  return response.data;
};

export const getPatientProfile = async () => {
  const response = await api.get('/auth/patient/me');
  return response.data;
};

export const getPatientAppointments = async () => {
  const response = await api.get('/patients/portal/appointments');
  return response.data;
};

export const getPatientMedicalRecords = async () => {
  const response = await api.get('/patients/records');
  return response.data;
};

export const getPatientInvoices = async () => {
  const response = await api.get('/patients/portal/invoices');
  return response.data;
};

export const payInvoice = async (invoice_id, amount_paid, payment_mode) => {
  const response = await api.post('/billing/pay', { invoice_id, amount_paid, payment_mode });
  return response.data;
};

export const markInvoicePaid = async (invoice_id) => {
  const response = await api.post(`/billing/invoice/${invoice_id}/mark-paid`);
  return response.data;
};

// Create Razorpay Order
export const createRazorpayOrder = async (invoice_id) => {
  const response = await api.post(`/billing/create-order`, { invoice_id });
  return response.data;
};

// Fetch Dynamic UPI QR Data for an Invoice
export const getInvoiceUpiQr = async (invoice_id) => {
  const response = await api.get(`/billing/invoice/${invoice_id}/upi-qr`);
  return response.data;
};

// Check invoice payment status in real-time
export const getInvoiceStatus = async (invoice_id) => {
  const response = await api.get(`/billing/invoice/${invoice_id}/status`);
  return response.data;
};

export const downloadInvoicePdf = async (invoiceId) => {
  try {
    const response = await api.get(`/billing/invoice/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Hospital_Invoice_${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(link.href), 1000);
  } catch (err) {
    console.error('Failed to download invoice PDF via blob:', err);
    const token = localStorage.getItem('hms_patient_token') || localStorage.getItem('token');
    const url = `${api.defaults.baseURL}/billing/invoice/${invoiceId}/pdf?token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank');
  }
};

export const downloadPrescriptionPdf = async (consultationId) => {
  const response = await api.get(`/patients/consultations/${consultationId}/prescription-pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `Medical_Report_Prescription_${consultationId}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

