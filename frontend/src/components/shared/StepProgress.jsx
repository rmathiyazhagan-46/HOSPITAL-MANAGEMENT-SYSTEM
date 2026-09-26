import React from 'react';
import { Check } from 'lucide-react';

const StepProgress = ({ steps, currentStep }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-600 transition-all duration-300 z-0"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                  isCompleted
                    ? 'bg-brand-600 text-white'
                    : isCurrent
                    ? 'bg-white border-2 border-brand-600 text-brand-600 shadow-md'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-brand-600 font-semibold' : 'text-slate-500'}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress;
