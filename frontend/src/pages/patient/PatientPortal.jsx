import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/shared/Badge';
import {
  Calendar,
  FileText,
  DollarSign,
  Pill,
  ArrowRight,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  RotateCw,
  XCircle,
  X,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPatientAppointments,
  getPatientMedicalRecords,
  getPatientInvoices,
} from '../../services/patientAuthService';
import { cancelAppointment } from '../../services/appointmentService';

const PatientPortal = () => {
  const { patientAuth } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadPortalData = async () => {
    try {
      const [appRes, recRes, invRes] = await Promise.all([
        getPatientAppointments(),
        getPatientMedicalRecords(),
        getPatientInvoices(),
      ]);
      setAppointments(appRes?.data || []);
      setRecords(recRes?.data || []);
      setInvoices(invRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'pending'
  );
  const pendingInvoices = invoices.filter((i) => i.status === 'pending');

  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    try {
      setCancelLoading(true);
      const res = await cancelAppointment(cancellingAppt.id);
      setToast({
        type: 'success',
        message: res?.message || 'Appointment cancelled successfully. The time slot has been released.',
      });
      setCancellingAppt(null);
      await loadPortalData();
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to cancel appointment.',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <DashboardShell role="patient" title="My Patient Health Portal">
      <div className="space-y-6">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all animate-in fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'orange'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : toast.type === 'orange' ? (
                <RotateCw className="w-4 h-4 text-amber-600 flex-shrink-0 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Welcome Banner with 12-Digit Patient ID */}
        <div className="bg-gradient-to-r from-brand-700 via-sky-600 to-brand-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Verified Patient Account</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Welcome, {patientAuth.user?.name || 'Patient'}
            </h2>
            <p className="text-xs sm:text-sm text-brand-100 mt-1">
              Your registered 12-Digit Patient ID:{' '}
              <span className="font-mono font-bold tracking-wider text-white bg-white/10 px-2 py-0.5 rounded-md">
                {patientAuth.user?.patient_id || '—'}
              </span>
            </p>
          </div>

          <Link
            to="/patient/book"
            className="py-3 px-6 rounded-2xl bg-white text-brand-700 font-bold text-sm hover:bg-brand-50 shadow-md transition-all inline-flex items-center gap-2 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book New Appointment</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Scheduled Appointments"
            value={upcomingAppointments.length}
            subtitle={upcomingAppointments.length > 0 ? `${upcomingAppointments.length} upcoming consultation(s)` : 'No upcoming appointments'}
            icon={Calendar}
            color="brand"
          />
          <StatCard
            title="Clinical Consultations"
            value={records.length}
            subtitle="Diagnostic & prescription history"
            icon={FileText}
            color="emerald"
          />
          <StatCard
            title="Pending Invoices"
            value={pendingInvoices.length}
            subtitle={pendingInvoices.length > 0 ? 'Awaiting settlement' : 'All invoices settled'}
            icon={DollarSign}
            color={pendingInvoices.length > 0 ? 'amber' : 'emerald'}
          />
        </div>

        {/* Upcoming Appointments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Your Upcoming Consultations</h3>
              <p className="text-xs text-slate-400">Manage your active appointments, reschedule or cancel anytime</p>
            </div>
            {upcomingAppointments.length > 0 && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                {upcomingAppointments.length} Active
              </span>
            )}
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Upcoming Appointments</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You do not have any active appointments scheduled. Book a consultation with our specialists in just a few steps.
              </p>
              <Link
                to="/patient/book"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Dr. {appt.doctor?.name || 'Physician'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {appt.doctor?.specialization || 'Specialist'} • {appt.department?.name || 'OPD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={appt.status === 'confirmed' ? 'success' : 'warning'}>
                        {appt.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Appointment Date</span>
                      <p className="font-bold text-slate-800 text-sm">{appt.appointment_date}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Time Slot</span>
                      <p className="font-bold text-brand-600 text-sm">{appt.time_slot}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Consultation Fee</span>
                      <p className="font-bold text-slate-800 text-sm">₹{Number(appt.doctor?.consultation_fee || 0).toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Reason for Visit</span>
                      <p className="font-medium text-slate-600 truncate">{appt.reason || 'Routine Consultation'}</p>
                    </div>
                  </div>

                  {/* Action Buttons: Reschedule & Cancel (Only for PENDING appointments) */}
                  {appt.status?.toUpperCase() === 'PENDING' && (
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <Link
                        to="/patient/book"
                        state={{ switchAppointment: appt }}
                        className="py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-brand-600" />
                        <span>Reschedule</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setCancellingAppt(appt)}
                        className="py-2 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Appointment</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        {cancellingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cancel Appointment?</h3>
                  <p className="text-xs text-slate-500">Are you sure you want to cancel this appointment?</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-800">Dr. {cancellingAppt.doctor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="font-bold text-slate-800">{cancellingAppt.appointment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Slot:</span>
                  <span className="font-bold text-brand-600">{cancellingAppt.time_slot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-700">{cancellingAppt.department?.name || 'OPD'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Cancelling will release the consultation time slot immediately, making it available for other patients to book.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setCancellingAppt(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleConfirmCancel}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {cancelLoading ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Yes, Cancel Appointment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Portal Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link
            to="/patient/records"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-brand-600 transition-colors">
              Medical & Prescription Records
            </h4>
            <p className="text-xs text-slate-500">
              Access past doctor diagnosis notes, treatment plans, and prescribed medicines.
            </p>
          </Link>

          <Link
            to="/patient/bills"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-brand-600 transition-colors">
              Bills, Payments & Tax Invoices
            </h4>
            <p className="text-xs text-slate-500">
              Pay pending hospital invoices via UPI/Card and download GST invoice PDFs.
            </p>
          </Link>

          <Link
            to="/patient/medicines"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
              <Pill className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-brand-600 transition-colors">
              Hospital Medicine Catalog
            </h4>
            <p className="text-xs text-slate-500">
              Browse hospital formulary, medications, indications, and dosage details.
            </p>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
};

export default PatientPortal;
