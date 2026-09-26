import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  DollarSign,
  Pill,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  CalendarCheck,
} from 'lucide-react';

const menusByRole = {
  admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Doctor Management', path: '/admin/doctors', icon: Stethoscope },
    { label: 'Leave Requests', path: '/admin/leaves', icon: CalendarCheck },
    { label: 'Patient Directory', path: '/admin/patients', icon: Users },
    { label: 'Pharmacy & Stock', path: '/admin/pharmacy', icon: Pill },
    { label: 'Revenue & Billing', path: '/admin/billing', icon: DollarSign },
  ],
  doctor: [
    { label: 'Appointments Queue', path: '/doctor/dashboard', icon: Calendar },
    { label: 'My Availability', path: '/doctor/availability', icon: CalendarCheck },
    { label: 'Leave Management', path: '/doctor/leaves', icon: FileText },
    { label: 'Patient Records', path: '/doctor/patient-view', icon: UserCheck },
    { label: 'Prescribe Medicine', path: '/doctor/prescribe', icon: FileText },
  ],
  patient: [
    { label: 'My Health Portal', path: '/patient/portal', icon: HeartPulse },
    { label: 'Book Appointment', path: '/patient/book', icon: Calendar },
    { label: 'Medical History', path: '/patient/records', icon: FileText },
    { label: 'Bills & Payments', path: '/patient/bills', icon: DollarSign },
    { label: 'Medicine Catalog', path: '/patient/medicines', icon: Pill },
  ],
};

const Sidebar = ({ role }) => {
  const items = menusByRole[role] || [];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 z-40">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md">
          <HeartPulse className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight text-white block">Apex Health</span>
          <span className="text-[10px] uppercase font-semibold text-brand-400 tracking-wider">
            {role} Portal
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Online</span>
        </div>
        <p>Apex Hospital Management v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
