import axios from 'axios';

const api = axios.create({
  baseURL: 'https://hospital-management-system-69g8.vercel.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token dynamically based on current route, target endpoint, and active portal
api.interceptors.request.use(
  (config) => {
    let token = null;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const url = config.url || '';
    const method = (config.method || 'get').toLowerCase();

    // 1. Route-aware priority: Match token with the portal route currently open in browser
    if (pathname.startsWith('/admin')) {
      token = localStorage.getItem('hms_admin_token');
    } else if (pathname.startsWith('/doctor')) {
      token = localStorage.getItem('hms_doctor_token');
    } else if (pathname.startsWith('/patient') || pathname.startsWith('/register/patient')) {
      token = localStorage.getItem('hms_patient_token');
    }

    // 2. Endpoint-aware priority: Match token with API role requirement if route is ambiguous or gateway
    if (!token) {
      if (
        url.startsWith('/auth/admin') || 
        url.startsWith('/billing') || 
        url.startsWith('/pharmacy/inventory') || 
        url.startsWith('/pharmacy/stock') ||
        url.startsWith('/doctors/leaves') ||
        (url.startsWith('/doctors') && !url.startsWith('/doctors/portal') && method !== 'get') ||
        (url.startsWith('/patients') && !url.startsWith('/patients/portal') && !url.includes('/records') && method !== 'get')
      ) {
        token = localStorage.getItem('hms_admin_token');
      } else if (url.startsWith('/doctors/portal') || url.startsWith('/auth/doctor')) {
        token = localStorage.getItem('hms_doctor_token');
      } else if (url.startsWith('/patients/portal') || url.startsWith('/patients/records') || url.startsWith('/auth/patient') || url.startsWith('/chatbot')) {
        token = localStorage.getItem('hms_patient_token');
      }
    }

    // 3. Explicit active role fallback
    if (!token) {
      const activeRole = localStorage.getItem('hms_active_role');
      if (activeRole === 'admin') {
        token = localStorage.getItem('hms_admin_token');
      } else if (activeRole === 'doctor') {
        token = localStorage.getItem('hms_doctor_token');
      } else if (activeRole === 'patient') {
        token = localStorage.getItem('hms_patient_token');
      }
    }

    // 4. Any available token fallback
    if (!token) {
      token = localStorage.getItem('hms_admin_token') || 
              localStorage.getItem('hms_doctor_token') || 
              localStorage.getItem('hms_patient_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
