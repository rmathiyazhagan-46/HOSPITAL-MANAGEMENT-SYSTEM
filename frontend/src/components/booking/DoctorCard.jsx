import React from 'react';
import { Award, Clock, DollarSign, CheckCircle2, Star, ShieldCheck, Stethoscope } from 'lucide-react';
import Badge from '../shared/Badge';

const DoctorCard = ({ doctor, isSelected, onSelect }) => {
  // Generate consistent rating based on id
  const rating = (4.8 + ((doctor.id * 7) % 3) * 0.1).toFixed(1);
  const reviewsCount = 85 + (doctor.id * 17) % 60;
  const isAvailableToday = doctor.availability_status === 'available';

  return (
    <div
      onClick={() => onSelect(doctor)}
      className={`group cursor-pointer p-5 rounded-2xl border transition-all text-left relative ${
        isSelected
          ? 'bg-brand-50/70 border-brand-500 ring-2 ring-brand-500/20 shadow-md transform -translate-y-0.5'
          : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {isSelected && (
        <div className="absolute top-4 right-4 text-brand-600 animate-in fade-in zoom-in duration-200">
          <CheckCircle2 className="w-5 h-5 fill-brand-600 text-white" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Doctor Photo / Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-teal-400 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            {doctor.name.replace('Dr. ', '').charAt(0)}
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs">
            <Stethoscope className="w-3.5 h-3.5 text-brand-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-bold text-slate-800 text-sm truncate">{doctor.name}</h4>
            {isAvailableToday ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {doctor.card_availability_text || '🟢 Available Today'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {doctor.card_availability_text || '🔴 Today Unavailable'}
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-brand-600 mb-0.5">{doctor.specialization}</p>
          <p className="text-[11px] text-slate-400 mb-2">{doctor.qualification}</p>

          {/* Rating & Experience */}
          <div className="flex items-center gap-3 text-xs mb-3">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
              <span className="text-slate-400 font-normal text-[11px]">({reviewsCount})</span>
            </div>
            <span className="text-slate-200">•</span>
            <div className="flex items-center gap-1 text-slate-600">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>{doctor.experience_years} yrs exp</span>
            </div>
          </div>

          {/* Fee Bottom Bar */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
            <span className="text-slate-500 text-[11px]">Consultation Fee</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{Number(doctor.consultation_fee).toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;

