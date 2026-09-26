import React, { useEffect, useState, useCallback } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { 
  Users, 
  Stethoscope, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Check, 
  X, 
  FileText, 
  Clock,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getRevenueStats, getDoctorsList, getAllPatientsList, changeAdminPassword } from '../../services/adminAuthService';
import { getAllAppointments, confirmAppointment, cancelAppointment } from '../../services/appointmentService';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    doctorsCount: 0,
    patientsCount: 0,
    appointmentsCount: 0,
    totalRevenue: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Consultation Notes Modal State
  const [viewingNotesAppt, setViewingNotesAppt] = useState(null);

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, error: null, success: false });

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordState({ loading: true, error: null, success: false });
    try {
      await changeAdminPassword(passwordForm);
      setPasswordState({ loading: false, error: null, success: true });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordState({ loading: false, error: null, success: false });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }, 2000);
    } catch (err) {
      setPasswordState({
        loading: false,
        error: err.response?.data?.message || 'Failed to change password',
        success: false
      });
    }
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [docsRes, patientsRes, revRes, apptsRes] = await Promise.all([
        getDoctorsList(),
        getAllPatientsList(),
        getRevenueStats(),
        getAllAppointments(),
      ]);

      const doctorsCount = docsRes?.data?.length || 0;
      const patientsCount = patientsRes?.data?.length || 0;
      const totalRevenue = revRes?.data?.totalRevenue || 0;
      const appts = apptsRes?.data || [];

      setStats({
        doctorsCount,
        patientsCount,
        appointmentsCount: appts.length,
        totalRevenue,
      });
      setAppointments(appts);

      const breakdown = revRes?.data?.breakdown || {};
      setRevenueBreakdown([
        { name: 'Consultation', amount: Number(breakdown.consultation) || 0 },
        { name: 'Pharmacy', amount: Number(breakdown.pharmacy) || 0 },
        { name: 'Other/Services', amount: Number(breakdown.final) || 0 },
      ]);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and Real-Time Polling Sync (every 8 seconds)
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 8000);

    const onFocus = () => fetchData(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  // Action: Confirm pending appointment
  const handleConfirmAppointment = async (id) => {
    try {
      setActionLoadingId(id);
      const res = await confirmAppointment(id);
      setToast({
        type: 'success',
        message: res?.message || `Appointment #${id} has been confirmed. The doctor can now consult & prescribe.`,
      });
      await fetchData(true);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || `Failed to confirm appointment #${id}.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Cancel appointment (only pending or confirmed)
  const handleCancelAppointment = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel appointment #${id}? The slot will be released immediately.`)) {
      return;
    }
    try {
      setActionLoadingId(id);
      const res = await cancelAppointment(id);
      setToast({
        type: 'success',
        message: res?.message || `Appointment #${id} cancelled. Time slot released.`,
      });
      await fetchData(true);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || `Failed to cancel appointment #${id}.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            PENDING
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            CONFIRMED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            CANCELLED
          </span>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const appointmentColumns = [
    { 
      header: 'ID', 
      accessor: 'id', 
      render: (row) => <span className="font-mono font-bold text-slate-700">#{row.id}</span> 
    },
    { 
      header: 'Patient Details', 
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.patient?.name || 'Walk-in Patient'}</p>
          <p className="text-[11px] text-slate-400 font-mono">ID: {row.patient?.patient_id || 'N/A'}</p>
        </div>
      ) 
    },
    { 
      header: 'Doctor', 
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">Dr. {row.doctor?.name || 'Physician'}</p>
          <p className="text-[11px] text-slate-500">{row.doctor?.specialization || 'Clinical Care'}</p>
        </div>
      ) 
    },
    { 
      header: 'Consultation Schedule', 
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.appointment_date}</p>
          <p className="text-xs text-brand-600 font-bold">{row.time_slot}</p>
        </div>
      ) 
    },
    {
      header: 'Status & Flow Stage',
      render: (row) => (
        <div className="space-y-1">
          {renderStatusBadge(row.status)}
          {row.status === 'confirmed' && row.confirmed_at && (
            <p className="text-[10px] text-blue-600 font-medium">
              Confirmed {new Date(row.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {row.status === 'completed' && row.completed_at && (
            <p className="text-[10px] text-emerald-600 font-medium">
              Completed {new Date(row.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {row.status === 'pending' && (
            <p className="text-[10px] text-amber-600">Awaiting confirmation</p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (row) => {
        const isLoading = actionLoadingId === row.id;

        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleConfirmAppointment(row.id)}
                disabled={isLoading}
                className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Confirm appointment slot"
              >
                {isLoading ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirm</span>
              </button>
              <button
                type="button"
                onClick={() => handleCancelAppointment(row.id)}
                disabled={isLoading}
                className="py-1 px-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Cancel appointment"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          );
        }

        if (row.status === 'confirmed') {
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCancelAppointment(row.id)}
                disabled={isLoading}
                className="py-1 px-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Cancel appointment"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          );
        }

        if (row.status === 'completed') {
          return (
            <button
              type="button"
              onClick={() => setViewingNotesAppt(row)}
              className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="View consultation assessment notes"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Notes</span>
            </button>
          );
        }

        return <span className="text-xs text-slate-400 italic">No action</span>;
      },
    },
  ];

  return (
    <DashboardShell role="admin" title="Hospital Administrative Overview">
      <div className="space-y-6">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all animate-in fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
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
        {/* Admin Identity Header */}
        <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-slate-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-200 border border-white/20 shadow-inner">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold mb-1 border border-indigo-400/30">
                <span>System Administrator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                Hospital Administration
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 self-start md:self-auto">
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs inline-flex items-center gap-2 backdrop-blur-md shadow-xs transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-indigo-200" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Doctors"
            value={stats.doctorsCount}
            subtitle="Active across departments"
            icon={Stethoscope}
            color="brand"
          />
          <StatCard
            title="Registered Patients"
            value={stats.patientsCount}
            subtitle="12-digit verified records"
            icon={Users}
            color="emerald"
          />
          <StatCard
            title="Total Appointments"
            value={stats.appointmentsCount}
            subtitle="Manual & AI chatbot source"
            icon={Calendar}
            color="purple"
          />
          <StatCard
            title="Gross Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            subtitle="Consultation + Pharmacy"
            icon={DollarSign}
            color="amber"
          />
        </div>

        {/* Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Revenue Distribution (INR)</h3>
                <p className="text-xs text-slate-400">Income classified by clinical service streams</p>
              </div>
              <span className="p-2 rounded-xl bg-slate-50 text-brand-600">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="amount" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Administrative Actions</h3>
              <p className="text-xs text-slate-400 mb-5">Quick hospital oversight tasks</p>
              <div className="space-y-3">
                <a
                  href="/admin/doctors"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-200 text-slate-700 hover:text-brand-700 flex items-center justify-between text-xs font-semibold transition-colors"
                >
                  <span>Register New Doctor</span>
                  <Stethoscope className="w-4 h-4" />
                </a>
                <a
                  href="/admin/pharmacy"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-200 text-slate-700 hover:text-brand-700 flex items-center justify-between text-xs font-semibold transition-colors"
                >
                  <span>Manage Medicine Batches</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </a>
                <a
                  href="/admin/billing"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-200 text-slate-700 hover:text-brand-700 flex items-center justify-between text-xs font-semibold transition-colors"
                >
                  <span>Download Revenue Audits</span>
                  <DollarSign className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-brand-50/60 border border-brand-200/60 text-xs text-brand-800">
              <span className="font-bold block mb-1">3NF Normalized Relational Core</span>
              <span>All appointments, consultations, and invoices strictly link with foreign key integrity.</span>
            </div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Recent Scheduled Consultations</h3>
              <p className="text-xs text-slate-400">Live booking logs • Real-time status transitions (Pending, Confirmed, Completed, Cancelled)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync Active</span>
              </div>
              <button
                type="button"
                onClick={() => fetchData(false)}
                disabled={refreshing}
                className="py-1 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh table now"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <DataTable
            columns={appointmentColumns}
            data={appointments}
            emptyMessage="No appointments recorded yet."
          />
        </div>

        {/* Consultation Notes Preview Modal */}
        <Modal
          isOpen={!!viewingNotesAppt}
          onClose={() => setViewingNotesAppt(null)}
          title={`Consultation Details — Appointment #${viewingNotesAppt?.id}`}
          maxWidth="max-w-lg"
        >
          {viewingNotesAppt && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold block">Status: Completed Consultation</span>
                  <span className="text-[11px] text-emerald-700">
                    Completed at: {viewingNotesAppt.completed_at ? new Date(viewingNotesAppt.completed_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <Badge variant="completed">COMPLETED</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Patient</span>
                  <span className="font-bold text-slate-800">{viewingNotesAppt.patient?.name || 'N/A'}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">ID: {viewingNotesAppt.patient?.patient_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Consulting Doctor</span>
                  <span className="font-bold text-slate-800">Dr. {viewingNotesAppt.doctor?.name || 'Physician'}</span>
                  <span className="block text-[11px] text-slate-500">{viewingNotesAppt.doctor?.specialization}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosis &amp; Clinical Notes</label>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                  {viewingNotesAppt.consultation_notes || viewingNotesAppt.consultation?.diagnosis_notes || 'No notes entered for this consultation.'}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingNotesAppt(null)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Change Password Modal */}
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => !passwordState.success && setIsPasswordModalOpen(false)}
          title="Change Password"
          maxWidth="max-w-md"
        >
          {passwordState.success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Password Updated</h3>
              <p className="text-sm text-slate-600">Your password has been changed successfully.</p>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordState.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{passwordState.error}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 outline-none transition-all"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 outline-none transition-all"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 outline-none transition-all"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordState.loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-70 flex justify-center items-center"
                >
                  {passwordState.loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;
