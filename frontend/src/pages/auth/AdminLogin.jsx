import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Building2, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminLogin } from '../../services/adminAuthService';

const AdminLogin = () => {
  const [hospitalName, setHospitalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  // Prevent browser autofill from pre-populating or showing prompt bubbles
  useEffect(() => {
    setHospitalName('');
    setEmail('');
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
      const data = await adminLogin(hospitalName ? hospitalName.trim() : undefined, email.trim(), password);
      if (data.success && data.token) {
        loginAdmin(data.token, data.admin);
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Invalid hospital email or password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid hospital email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portals Gateway</span>
        </Link>

        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4 ring-4 ring-indigo-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">Hospital Administration</h2>
        <p className="text-xs text-slate-400 mt-1">
          Single administrative gateway for hospital operations, credentialing & revenue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800 ring-1 ring-white/10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            {/* Hidden dummy inputs to block browser autofill heuristics */}
            <input type="text" name="prevent_autofill_admin_user" className="hidden" tabIndex="-1" autoComplete="off" />
            <input type="password" name="prevent_autofill_admin_pass" className="hidden" tabIndex="-1" autoComplete="new-password" />

            {/* Hospital Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Hospital Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="manual_admin_hospital_name"
                  id="manual_admin_hospital_name"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Metro General Apex Hospital"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Hospital Email - Admin must type manually */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Hospital Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="manual_hospital_email"
                  id="manual_hospital_email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Hospital Email (e.g. admin@hospital.org)"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Admin Password - Admin must type manually, with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="manual_admin_password"
                  id="manual_admin_password"
                  required
                  autoComplete="new-password"
                  readOnly={isReadOnly}
                  onFocus={() => setIsReadOnly(false)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Admin Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
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
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating Executive...' : 'Sign In to Admin Dashboard'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
