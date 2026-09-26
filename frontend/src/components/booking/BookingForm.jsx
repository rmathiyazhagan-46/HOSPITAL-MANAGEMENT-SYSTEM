import React from 'react';
import { User, Phone, Mail, Calendar, FileText, Stethoscope, ShieldCheck, DollarSign, HeartPulse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BookingForm = ({ doctor, date, slot, department, bloodGroup, onBloodGroupChange, reason, onReasonChange }) => {
  const { user, patientAuth } = useAuth();
  const patient = patientAuth?.user || user;

  return (
    <div className="space-y-6">
      {/* Auto-filled Patient Information Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-bold text-slate-800">
              Patient Identification Details
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Auto-filled from Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-500 block mb-1">Full Legal Name</label>
            <input
              type="text"
              readOnly
              value={patient?.name || ''}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">12-Digit Patient ID</label>
            <input
              type="text"
              readOnly
              value={patient?.patient_id || ''}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-brand-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">Contact Phone</label>
            <input
              type="text"
              readOnly
              value={patient?.phone || ''}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-500 block mb-1">Registered Email</label>
            <input
              type="text"
              readOnly
              value={patient?.email || ''}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Blood Group input */}
        <div className="pt-2 mt-4 border-t border-slate-100">
          <label className="font-semibold text-slate-700 block mb-1.5 text-xs">
            Blood Group <span className="text-rose-500">*</span>
          </label>
          <select
            value={bloodGroup}
            onChange={(e) => onBloodGroupChange(e.target.value)}
            className="w-full sm:w-1/2 p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            required
          >
            <option value="" disabled>Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        {/* Reason / Symptoms input */}
        <div className="pt-4">
          <label className="font-semibold text-slate-700 block mb-1.5 text-xs flex items-center justify-between">
            <span>Chief Complaints / Symptoms & Reason for Visit</span>
            <span className="text-slate-400 font-normal text-[11px]">(Optional for Doctor's reference)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="E.g. Experiencing mild chest discomfort after exercise, persistent fatigue for past 3 days..."
            className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 leading-relaxed"
          />
        </div>
      </div>

      {/* Consultation Summary Card */}
      {doctor && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm font-bold text-teal-400">
              <Stethoscope className="w-4 h-4" />
              <span>Consultation Review & Fee Breakdown</span>
            </div>
            <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">
              OPD Cabin {100 + (doctor.id % 20)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 text-[11px]">Specialist Physician</p>
              <h4 className="font-bold text-base text-white mt-0.5">{doctor.name}</h4>
              <p className="text-teal-300 font-medium">{doctor.specialization}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{department?.name || 'Clinical OPD'}</p>
            </div>

            <div>
              <p className="text-slate-400 text-[11px]">Chosen Schedule</p>
              <p className="font-bold text-white text-sm mt-0.5">{date}</p>
              <p className="font-mono text-teal-300 font-bold mt-0.5">{slot}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs">Consultation Charge (Payable at Hospital or Portal)</span>
              <p className="text-[11px] text-teal-300">Standard OPD registration & physician consultation included</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">
                ₹{Number(doctor.consultation_fee).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;

