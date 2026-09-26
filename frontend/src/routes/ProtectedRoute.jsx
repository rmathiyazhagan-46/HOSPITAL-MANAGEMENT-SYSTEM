import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ role }) => {
  const { adminAuth, doctorAuth, patientAuth, setActiveRole } = useAuth();

  useEffect(() => {
    if (role) {
      localStorage.setItem('hms_active_role', role);
      if (setActiveRole) {
        setActiveRole(role);
      }
    }
  }, [role, setActiveRole]);

  if (role === 'admin') {
    if (!adminAuth.token) {
      return <Navigate to="/login/admin" replace />;
    }
  } else if (role === 'doctor') {
    if (!doctorAuth.token) {
      return <Navigate to="/login/doctor" replace />;
    }
  } else if (role === 'patient') {
    if (!patientAuth.token) {
      return <Navigate to="/login/patient" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
