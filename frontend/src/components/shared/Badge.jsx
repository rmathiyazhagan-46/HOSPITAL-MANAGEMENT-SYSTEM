import React from 'react';

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  orange: 'bg-orange-50 text-orange-700 border-orange-300',
  pending_verification: 'bg-orange-50 text-orange-700 border-orange-300',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-300',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-300',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
};

const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const chosen = variantClasses[variant] || variantClasses.neutral;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${chosen} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
