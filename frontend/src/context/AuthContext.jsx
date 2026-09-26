import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('hms_active_role') || null);

  const [adminAuth, setAdminAuth] = useState(() => ({
    token: localStorage.getItem('hms_admin_token') || null,
    user: JSON.parse(localStorage.getItem('hms_admin_user') || 'null'),
  }));

  const [doctorAuth, setDoctorAuth] = useState(() => ({
    token: localStorage.getItem('hms_doctor_token') || null,
    user: JSON.parse(localStorage.getItem('hms_doctor_user') || 'null'),
  }));

  const [patientAuth, setPatientAuth] = useState(() => ({
    token: localStorage.getItem('hms_patient_token') || null,
    user: JSON.parse(localStorage.getItem('hms_patient_user') || 'null'),
  }));

  const loginAdmin = (token, user) => {
    localStorage.setItem('hms_admin_token', token);
    localStorage.setItem('hms_admin_user', JSON.stringify(user));
    localStorage.setItem('hms_active_role', 'admin');
    setAdminAuth({ token, user });
    setActiveRole('admin');
  };

  const loginDoctor = (token, user) => {
    localStorage.setItem('hms_doctor_token', token);
    localStorage.setItem('hms_doctor_user', JSON.stringify(user));
    localStorage.setItem('hms_active_role', 'doctor');
    setDoctorAuth({ token, user });
    setActiveRole('doctor');
  };

  const loginPatient = (token, user) => {
    localStorage.setItem('hms_patient_token', token);
    localStorage.setItem('hms_patient_user', JSON.stringify(user));
    localStorage.setItem('hms_active_role', 'patient');
    setPatientAuth({ token, user });
    setActiveRole('patient');
  };

  const logout = (role) => {
    if (role === 'admin') {
      localStorage.removeItem('hms_admin_token');
      localStorage.removeItem('hms_admin_user');
      setAdminAuth({ token: null, user: null });
    } else if (role === 'doctor') {
      localStorage.removeItem('hms_doctor_token');
      localStorage.removeItem('hms_doctor_user');
      setDoctorAuth({ token: null, user: null });
    } else if (role === 'patient') {
      localStorage.removeItem('hms_patient_token');
      localStorage.removeItem('hms_patient_user');
      setPatientAuth({ token: null, user: null });
    }

    if (activeRole === role) {
      localStorage.removeItem('hms_active_role');
      setActiveRole(null);
    }
  };

  const currentUser =
    activeRole === 'admin'
      ? adminAuth.user
      : activeRole === 'doctor'
      ? doctorAuth.user
      : activeRole === 'patient'
      ? patientAuth.user
      : (patientAuth.user || doctorAuth.user || adminAuth.user);

  return (
    <AuthContext.Provider
      value={{
        activeRole,
        setActiveRole,
        adminAuth,
        doctorAuth,
        patientAuth,
        user: currentUser,
        loginAdmin,
        loginDoctor,
        loginPatient,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
