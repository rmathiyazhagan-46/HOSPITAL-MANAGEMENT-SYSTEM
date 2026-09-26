import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Copy, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

const PatientRegisterSuccess = () => {
  const location = useLocation();
  const patient = location.state?.patient;
  const [copied, setCopied] = React.useState(false);

  const patientId = patient?.patient_id || '';

  const copyId = () => {
    if (!patientId) return;
    navigator.clipboard.writeText(patientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Registration Complete!</h2>
        <p className="text-xs text-slate-500 mt-1">
          Your hospital record has been created. Please save your assigned 12-digit Patient ID.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-200">
          <div className="p-4 rounded-2xl bg-brand-50/80 border border-brand-200 text-center mb-6">
            <span className="text-xs uppercase font-semibold tracking-wider text-brand-700 block mb-1">
              Your 12-Digit Patient ID
            </span>
            <div className="flex items-center justify-center gap-3 my-2">
              <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                {patientId}
              </span>
              <button
                onClick={copyId}
                className="p-1.5 rounded-lg bg-white border border-brand-300 text-brand-600 hover:bg-brand-100 transition-colors shadow-2xs"
                title="Copy Patient ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <span className="text-[10px] text-emerald-600 font-semibold mb-1 block">Copied to clipboard!</span>}
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mt-2">
              ⚠️ Save this ID — you'll need it to log in
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-2 mb-6">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Patient Name</span>
              <span className="font-semibold text-slate-800">{patient?.name || 'Registered Patient'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Date of Birth</span>
              <span className="font-semibold text-slate-800">{patient?.dob || 'Registered'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Phone</span>
              <span className="font-semibold text-slate-800">{patient?.phone || 'Verified'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Security</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Aadhar Encrypted At Rest
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/patient/portal"
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Patient Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login/patient"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-all text-center block"
            >
              Sign In via Patient Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRegisterSuccess;
