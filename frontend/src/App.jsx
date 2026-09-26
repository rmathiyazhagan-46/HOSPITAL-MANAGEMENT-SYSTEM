import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth & Landing Pages
import Landing from './pages/auth/Landing';
import AdminLogin from './pages/auth/AdminLogin';
import DoctorLogin from './pages/auth/DoctorLogin';
import PatientLogin from './pages/auth/PatientLogin';
import PatientRegister from './pages/auth/PatientRegister';
import PatientRegisterSuccess from './pages/auth/PatientRegisterSuccess';

// Admin Portal Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorManagement from './pages/admin/DoctorManagement';
import PatientManagement from './pages/admin/PatientManagement';
import BillingRevenue from './pages/admin/BillingRevenue';
import PharmacyInventory from './pages/admin/PharmacyInventory';
import AdminDoctorLeaves from './pages/admin/AdminDoctorLeaves';

// Doctor Portal Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAvailability from './pages/doctor/DoctorAvailability';
import DoctorLeaveApply from './pages/doctor/DoctorLeaveApply';
import PatientView from './pages/doctor/PatientView';
import Prescribe from './pages/doctor/Prescribe';

// Patient Portal Pages
import PatientPortal from './pages/patient/PatientPortal';
import BookAppointment from './pages/patient/BookAppointment';
import MedicalRecords from './pages/patient/MedicalRecords';
import BillsAndPayments from './pages/patient/BillsAndPayments';
import MedicineList from './pages/patient/MedicineList';

// Protected Route Guard
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public & Gateway Pages */}
      <Route path="/" element={<Landing />} />

      {/* 3 Separate Login Systems & Registration */}
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/doctor" element={<DoctorLogin />} />
      <Route path="/login/patient" element={<PatientLogin />} />
      <Route path="/register/patient" element={<PatientRegister />} />
      <Route path="/register/patient-success" element={<PatientRegisterSuccess />} />

      {/* Legacy / Aliased Route Redirects */}
      <Route path="/admin/login" element={<Navigate to="/login/admin" replace />} />
      <Route path="/doctor/login" element={<Navigate to="/login/doctor" replace />} />
      <Route path="/patient/login" element={<Navigate to="/login/patient" replace />} />
      <Route path="/patient/register" element={<Navigate to="/register/patient" replace />} />
      <Route path="/patient/register-success" element={<Navigate to="/register/patient-success" replace />} />

      {/* Admin Portal (Protected) */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/doctors" element={<DoctorManagement />} />
        <Route path="/admin/leaves" element={<AdminDoctorLeaves />} />
        <Route path="/admin/patients" element={<PatientManagement />} />
        <Route path="/admin/billing" element={<BillingRevenue />} />
        <Route path="/admin/pharmacy" element={<PharmacyInventory />} />
      </Route>

      {/* Doctor Portal (Protected) */}
      <Route element={<ProtectedRoute role="doctor" />}>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/availability" element={<DoctorAvailability />} />
        <Route path="/doctor/leaves" element={<DoctorLeaveApply />} />
        <Route path="/doctor/patient-view" element={<PatientView />} />
        <Route path="/doctor/prescribe" element={<Prescribe />} />
      </Route>

      {/* Patient Portal (Protected) */}
      <Route element={<ProtectedRoute role="patient" />}>
        <Route path="/patient/portal" element={<PatientPortal />} />
        <Route path="/patient/book" element={<BookAppointment />} />
        <Route path="/patient/records" element={<MedicalRecords />} />
        <Route path="/patient/bills" element={<BillsAndPayments />} />
        <Route path="/patient/medicines" element={<MedicineList />} />
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
