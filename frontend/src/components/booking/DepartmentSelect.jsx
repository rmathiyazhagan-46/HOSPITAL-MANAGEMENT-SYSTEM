import React from 'react';
import { 
  Stethoscope, 
  Heart, 
  Brain, 
  Bone, 
  Baby, 
  Sparkles, 
  Activity, 
  Users, 
  CheckCircle2 
} from 'lucide-react';

const iconsMap = {
  Cardiology: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
  Neurology: { icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
  Orthopedics: { icon: Bone, color: 'text-amber-600', bg: 'bg-amber-50' },
  Pediatrics: { icon: Baby, color: 'text-teal-600', bg: 'bg-teal-50' },
  Dermatology: { icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-50' },
  'General Medicine': { icon: Stethoscope, color: 'text-brand-600', bg: 'bg-brand-50' },
  'Emergency & Critical Care': { icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
};

const DepartmentSelect = ({ departments = [], selectedId, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((dept) => {
        const config = iconsMap[dept.name] || { icon: Stethoscope, color: 'text-brand-600', bg: 'bg-brand-50' };
        const Icon = config.icon;
        const isSelected = selectedId === dept.id;

        return (
          <div
            key={dept.id}
            onClick={() => onSelect(dept.id)}
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

            <div className="flex items-center gap-3.5 mb-2.5">
              <div
                className={`p-3 rounded-xl transition-colors ${
                  isSelected ? 'bg-brand-600 text-white' : `${config.bg} ${config.color} group-hover:scale-105 transition-transform`
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{dept.name}</h4>
                <span className="text-[11px] text-slate-400 font-medium">Specialized Care</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{dept.description}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DepartmentSelect;

