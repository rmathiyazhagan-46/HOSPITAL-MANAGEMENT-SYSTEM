import React, { useState } from 'react';
import { Activity, Stethoscope, ChevronRight, Check } from 'lucide-react';

const SYMPTOM_OPTIONS = [
  { label: 'Chest Pain / Palpitations', query: 'I have chest pain and palpitations', dept: 'Cardiology' },
  { label: 'Headache / Dizziness', query: 'I have a persistent headache and dizziness', dept: 'Neurology' },
  { label: 'Fever / Cough / Cold', query: 'I have fever, cough, and body ache', dept: 'General Medicine' },
  { label: 'Joint / Knee / Back Pain', query: 'I have severe joint pain and knee swelling', dept: 'Orthopedics' },
  { label: 'Skin Rash / Allergy', query: 'I have a skin rash and severe itching', dept: 'Dermatology' },
  { label: 'Stomach Ache / Acidity', query: 'I am experiencing stomach pain and nausea', dept: 'General Medicine' },
  { label: 'Child / Infant Health', query: 'My child has fever and needs vaccination', dept: 'Pediatrics' },
];

const SymptomChecker = ({ onSelectSymptom }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-brand-50/70 rounded-2xl border border-brand-200/80 p-3 my-2 text-left">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-bold text-brand-800 hover:text-brand-900"
      >
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-brand-600" />
          <span>Quick Symptom Checker</span>
        </div>
        <span className="text-[11px] font-semibold text-brand-600 underline">
          {isExpanded ? 'Hide' : 'Select Symptoms'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-brand-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in duration-150">
          {SYMPTOM_OPTIONS.map((symptom, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectSymptom(symptom.query);
                setIsExpanded(false);
              }}
              className="text-left p-2 rounded-xl bg-white border border-brand-100 hover:border-brand-400 hover:bg-white shadow-2xs transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-semibold text-slate-800">{symptom.label}</p>
                <p className="text-[10px] text-teal-600 font-medium">{symptom.dept}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
