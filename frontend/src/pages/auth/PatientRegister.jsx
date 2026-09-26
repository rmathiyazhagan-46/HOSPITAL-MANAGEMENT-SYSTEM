import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, User, Phone, Mail, Calendar, CreditCard, ArrowLeft, AlertCircle } from 'lucide-react';
import { registerPatient } from '../../services/patientAuthService';
import { useAuth } from '../../context/AuthContext';

const PatientRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    aadhar_number: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginPatient } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.aadhar_number.length !== 12) {
      setError('Aadhar Number must be exactly 12 digits.');
      return;
    }

    setLoading(true);
    try {
      const data = await registerPatient(formData);
      if (data.success && data.patient) {
        // Auto authenticate and redirect to success confirmation
        loginPatient(data.token, data.patient);
        navigate('/register/patient-success', { state: { patient: data.patient } });
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const serverMsg = err.response?.data?.message;
      const errorList = err.response?.data?.errors;
      if (Array.isArray(errorList)) {
        setError(errorList.map((e) => e.message || e).join(', '));
      } else if (typeof errorList === 'string') {
        setError(errorList);
      } else if (serverMsg) {
        setError(serverMsg);
      } else if (err.message === 'Network Error' || !err.response) {
        setError('Cannot connect to backend server. Please ensure the backend is running on http://localhost:5000.');
      } else {
        setError(err.message || 'Failed to complete registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portals Gateway</span>
        </Link>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-brand-600 text-white flex items-center justify-center shadow-md mb-4">
          <HeartPulse className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">New Patient Registration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Register to receive your unique 12-digit Patient ID for appointments and records.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Aadhar Number (12 Digits - Encrypted at Rest)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="aadhar_number"
                  required
                  maxLength={12}
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value.replace(/\D/g, '') })}
                  placeholder="12-digit National ID"
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Patient Profile...' : 'Complete Registration'}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            <span>Already registered? </span>
            <Link to="/login/patient" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in with Patient ID
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRegister;
