import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Bot,
  UserPlus,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  Clock,
  Award,
} from 'lucide-react';
import ChatWidget from '../../components/chatbot/ChatWidget';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50/40 text-slate-800">
      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
              APEX HEALTH
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-600">
              Hospital Management System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/register/patient"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors hidden sm:block"
          >
            New Patient Register
          </Link>
          <Link
            to="/login/patient"
            className="text-sm font-semibold py-2 px-4 rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors"
          >
            Patient Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Next-Gen Multi-Role Hospital & Clinic Suite</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Seamless Healthcare Management for{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-sky-500">
              Admins, Doctors & Patients
            </span>
          </h2>

          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Enterprise workflow supporting patient registration, intelligent slot booking, doctor
            consultation records, digital prescriptions, integrated pharmacy inventory, and automated billing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register/patient"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-all shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              <span>Register as New Patient</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 3 Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          {/* Admin Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hospital Admin</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Hospital oversight, doctor credentialing, department configuration, pharmacy inventory batches, and revenue analytics.
              </p>
            </div>
            <Link
              to="/login/admin"
              className="inline-flex items-center justify-between w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-sm font-semibold transition-all"
            >
              <span>Admin Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Doctor Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-105 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Doctor Portal</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Daily scheduled consultation queues, patient medical histories, clinical diagnosis notes, and digital drug prescriptions.
              </p>
            </div>
            <Link
              to="/login/doctor"
              className="inline-flex items-center justify-between w-full py-3 px-4 rounded-xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 text-sm font-semibold transition-all"
            >
              <span>Doctor Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Patient Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all group flex flex-col justify-between ring-2 ring-brand-500/20">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-brand-500 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-105 transition-transform">
                <HeartPulse className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Patient Portal</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                12-digit patient login, conflict-free appointment booking, medical records, digital prescriptions, and PDF invoice downloads.
              </p>
            </div>
            <Link
              to="/login/patient"
              className="inline-flex items-center justify-between w-full py-3 px-4 rounded-xl bg-brand-600 text-white hover:bg-brand-700 text-sm font-semibold transition-all shadow-sm"
            >
              <span>Patient Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto pt-8 border-t border-slate-200 text-slate-600">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-6 h-6 text-brand-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-800">Conflict-Free Booking</p>
              <p>Optimized composite indexed slot allocations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-brand-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-800">AI Medical Triage</p>
              <p>Instant symptom-to-department recommendation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-brand-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-800">Enterprise Security</p>
              <p>Aadhar encryption at rest & strict role authorization</p>
            </div>
          </div>
        </div>
      </main>

      <ChatWidget />
    </div>
  );
};

export default Landing;
