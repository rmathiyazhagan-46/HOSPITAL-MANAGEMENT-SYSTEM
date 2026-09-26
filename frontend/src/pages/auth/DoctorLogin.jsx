import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Lock, BadgeCheck, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doctorLogin } from '../../services/doctorAuthService';
import AnimatedLogo from '../../components/AnimatedLogo';

const DoctorLogin = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginDoctor } = useAuth();
  const navigate = useNavigate();

  // Prevent browser autofill from popping up or pre-populating saved credentials
  useEffect(() => {
    setEmployeeId('');
    setPassword('');
    const timer = setTimeout(() => {
      setIsReadOnly(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await doctorLogin(employeeId.trim(), password);
      if (data.success && data.token) {
        loginDoctor(data.token, data.doctor);
        navigate('/doctor/dashboard');
      } else {
        setError(data.message || 'Invalid Employee ID or password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Employee ID or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-50 text-slate-800 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portals Gateway</span>
        </Link>

        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20 mb-4 ring-4 ring-teal-500/10">
          <AnimatedLogo className="w-7 h-7" anchorColor="currentColor" swooshColor="rgba(255,255,255,0.9)" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Doctor Clinical Portal</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your appointment queue, patient clinical records, and prescription pad.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-teal-100 ring-1 ring-teal-500/10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            {/* Hidden dummy inputs to block browser autofill heuristics */}
            <input type="text" name="prevent_autofill_user" className="hidden" tabIndex="-1" autoComplete="off" />
            <input type="password" name="prevent_autofill_pass" className="hidden" tabIndex="-1" autoComplete="new-password" />

            {/* Employee ID - Doctor must type manually */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Doctor Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="manual_doctor_employee_id"
                  id="manual_doctor_employee_id"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  placeholder="Enter Doctor Employee ID"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password - With Eye Icon Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Clinical Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="manual_doctor_password"
                  id="manual_doctor_password"
                  required
                  autoComplete="new-password"
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Clinical Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-teal-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In as Doctor'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
