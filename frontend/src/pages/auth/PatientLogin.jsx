import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Hash, User, Calendar, ArrowLeft, AlertCircle, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { patientLogin } from '../../services/patientAuthService';
import AnimatedLogo from '../../components/AnimatedLogo';
import SplashIntro from '../../components/SplashIntro';

const PatientLogin = () => {
  const [showSplash, setShowSplash] = useState(true);
  
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginPatient } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanId = patientId.trim();
    if (!/^\d{12}$/.test(cleanId)) {
      setError('Details do not match our records');
      return;
    }

    setLoading(true);

    try {
      const data = await patientLogin(cleanId, name.trim(), dob.trim());
      if (data.success && data.token) {
        loginPatient(data.token, data.patient);
        navigate('/patient/portal');
      } else {
        setError(data.message || 'Details do not match our records');
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again after 15 minutes.');
      } else {
        setError(err.response?.data?.message || 'Details do not match our records');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSplash && <SplashIntro onComplete={() => setShowSplash(false)} />}
      
      <div className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 px-6 lg:px-8 transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none"></div>
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portals Gateway</span>
          </Link>

          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4 ring-1 ring-slate-100">
              <AnimatedLogo className="w-8 h-8" anchorColor="#0369a1" swooshColor="#0ea5e9" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Apex Hospital</h2>
            <p className="text-sm font-semibold text-sky-600 mt-1 uppercase tracking-widest">Patient Portal</p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-100">
            
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* 12-Digit Patient ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    12-Digit Patient ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-600">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 991000000001"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Registered Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name as registered"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Date of Birth
                    </label>
                    <a href="#" onClick={(e) => { e.preventDefault(); alert('Please contact the hospital front desk to recover your ID or update your details.'); }} className="text-xs text-sky-600 hover:text-sky-800 font-medium transition-colors">
                      Forgot ID?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center mt-4">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500/20"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600">
                    Remember me on this device
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || patientId.length !== 12 || !name || !dob}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0d2f6b] to-[#1e88e5] hover:to-[#29a8ff] text-white font-semibold text-sm shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Verifying Identity...' : 'Sign In to Portal'}
                  </button>
                </div>
              </form>

            <div className="mt-5 p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center gap-2 text-[11px] text-sky-800">
              <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Rate-limited to 5 attempts per 15 minutes for your security.</span>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-2">First time visiting our hospital?</p>
              <Link
                to="/register/patient"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register to receive your 12-Digit Patient ID</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientLogin;
