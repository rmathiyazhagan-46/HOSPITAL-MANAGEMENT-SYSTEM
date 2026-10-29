import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
const Landing = lazy(() => import('./pages/auth/Landing'));
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));
const DoctorLogin = lazy(() => import('./pages/auth/DoctorLogin'));
const PatientLogin = lazy(() => import('./pages/auth/PatientLogin'));
const PatientRegister = lazy(() => import('./pages/auth/PatientRegister'));
const PatientRegisterSuccess = lazy(() => import('./pages/auth/PatientRegisterSuccess'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const DoctorManagement = lazy(() => import('./pages/admin/DoctorManagement'));
const PatientManagement = lazy(() => import('./pages/admin/PatientManagement'));
const BillingRevenue = lazy(() => import('./pages/admin/BillingRevenue'));
const PharmacyInventory = lazy(() => import('./pages/admin/PharmacyInventory'));
const AdminDoctorLeaves = lazy(() => import('./pages/admin/AdminDoctorLeaves'));
const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const DoctorAvailability = lazy(() => import('./pages/doctor/DoctorAvailability'));
const DoctorLeaveApply = lazy(() => import('./pages/doctor/DoctorLeaveApply'));
const PatientView = lazy(() => import('./pages/doctor/PatientView'));
const Prescribe = lazy(() => import('./pages/doctor/Prescribe'));
const PatientPortal = lazy(() => import('./pages/patient/PatientPortal'));
const BookAppointment = lazy(() => import('./pages/patient/BookAppointment'));
const MedicalRecords = lazy(() => import('./pages/patient/MedicalRecords'));
const BillsAndPayments = lazy(() => import('./pages/patient/BillsAndPayments'));
const MedicineList = lazy(() => import('./pages/patient/MedicineList'));
function App() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading page...</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/doctor" element={<DoctorLogin />} />
        <Route path="/login/patient" element={<PatientLogin />} />
        <Route path="/register/patient" element={<PatientRegister />} />
        <Route path="/register/patient-success" element={<PatientRegisterSuccess />} />
        <Route path="/admin/login" element={<Navigate to="/login/admin" replace />} />
        <Route path="/doctor/login" element={<Navigate to="/login/doctor" replace />} />
        <Route path="/patient/login" element={<Navigate to="/login/patient" replace />} />
        <Route path="/patient/register" element={<Navigate to="/register/patient" replace />} />
        <Route path="/patient/register-success" element={<Navigate to="/register/patient-success" replace />} />
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/doctors" element={<DoctorManagement />} />
          <Route path="/admin/leaves" element={<AdminDoctorLeaves />} />
          <Route path="/admin/patients" element={<PatientManagement />} />
          <Route path="/admin/billing" element={<BillingRevenue />} />
          <Route path="/admin/pharmacy" element={<PharmacyInventory />} />
        </Route>
        <Route element={<ProtectedRoute role="doctor" />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/availability" element={<DoctorAvailability />} />
          <Route path="/doctor/leaves" element={<DoctorLeaveApply />} />
          <Route path="/doctor/patient-view" element={<PatientView />} />
          <Route path="/doctor/prescribe" element={<Prescribe />} />
        </Route>
        <Route element={<ProtectedRoute role="patient" />}>
          <Route path="/patient/portal" element={<PatientPortal />} />
          <Route path="/patient/book" element={<BookAppointment />} />
          <Route path="/patient/records" element={<MedicalRecords />} />
          <Route path="/patient/bills" element={<BillsAndPayments />} />
          <Route path="/patient/medicines" element={<MedicineList />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
export default App;
