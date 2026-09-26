import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { 
  Calendar, 
  UserCheck, 
  Clock, 
  FileEdit, 
  CheckCircle, 
  Stethoscope, 
  CalendarCheck, 
  CalendarDays, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2, 
  X,
  Check,
  Lock,
  RotateCw,
  FileText,
  AlertTriangle,
  Pill
} from 'lucide-react';
import { getDoctorAppointmentsQueue, changeDoctorPassword } from '../../services/doctorAuthService';
import { confirmAppointment } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';

const DoctorDashboard = () => {
  const { doctorAuth } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState(location.state?.tab || 'all'); // 'today', 'upcoming', 'completed', 'all'
  const [confirmingId, setConfirmingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Completed Consultation Details Modal State
  const [viewingConsultationAppt, setViewingConsultationAppt] = useState(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, error: null, success: false });

  const todayDate = new Date();
  const todayStr = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // If redirected with state tab, switch to that tab
  useEffect(() => {
    if (location.state?.tab) {
      setFilterStatus(location.state.tab);
    }
  }, [location.state]);

  const loadQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await getDoctorAppointmentsQueue();
      setAppointments(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and real-time polling sync (every 8 seconds)
  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      loadQueue(true);
    }, 8000);

    const onFocus = () => loadQueue(true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadQueue]);

  // Doctor Action: Confirm pending appointment slot
  const handleConfirmAppointment = async (id) => {
    try {
      setConfirmingId(id);
      const res = await confirmAppointment(id);
      setToast({
        type: 'success',
        message: res?.message || `Appointment #${id} confirmed! You can now proceed to Consult & Prescribe.`,
      });
      await loadQueue(true);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || `Failed to confirm appointment #${id}.`,
      });
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordState({ loading: true, error: null, success: false });
    try {
      await changeDoctorPassword(passwordForm);
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

  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === todayStr && a.status !== 'cancelled'
  );
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date >= todayStr && (a.status === 'confirmed' || a.status === 'pending')
  );
  const completedAppointments = appointments.filter((a) => a.status === 'completed');

  const displayedAppointments = appointments.filter((a) => {
    if (filterStatus === 'today') {
      return a.appointment_date === todayStr;
    }
    if (filterStatus === 'upcoming') {
      return a.appointment_date >= todayStr && (a.status === 'confirmed' || a.status === 'pending');
    }
    if (filterStatus === 'completed') {
      return a.status === 'completed';
    }
    return true;
  });

  const doctorDisplayName = doctorAuth.user?.name
    ? (doctorAuth.user.name.startsWith('Dr.') ? doctorAuth.user.name : `Dr. ${doctorAuth.user.name}`)
    : 'Dr. Physician';

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

  const columns = [
    { header: 'Appt #', accessor: 'id', render: (row) => <span className="font-mono font-bold text-slate-700">#{row.id}</span> },
    {
      header: 'Patient Details',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.patient?.name || 'Walk-in'}</p>
          <p className="text-xs text-slate-400 font-mono">ID: {row.patient?.patient_id || 'N/A'}</p>
        </div>
      ),
    },
    { header: 'Contact', render: (row) => row.patient?.phone || 'N/A' },
    {
      header: 'Consultation Date',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-slate-700">{row.appointment_date}</span>
          {row.appointment_date === todayStr && (
            <span className="text-[10px] bg-brand-50 border border-brand-200 text-brand-700 font-bold px-1.5 py-0.5 rounded">
              Today
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Scheduled Slot',
      accessor: 'time_slot',
      render: (row) => <span className="font-semibold text-brand-600">{row.time_slot}</span>,
    },
    {
      header: 'Reason for Visit',
      render: (row) => (
        <span className="text-xs text-slate-600 max-w-[160px] truncate block" title={row.reason}>
          {row.reason || 'Routine Consultation'}
        </span>
      ),
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
            <p className="text-[10px] text-amber-600 font-medium">Action Required: Confirm</p>
          )}
        </div>
      ),
    },
    {
      header: 'Clinical Action',
      render: (row) => {
        const isConfirming = confirmingId === row.id;

        if (row.status === 'pending') {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirmAppointment(row.id)}
                disabled={isConfirming}
                className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Accept/Confirm this appointment slot to enable Consult & Prescribe"
              >
                {isConfirming ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirm Slot</span>
              </button>

              <button
                type="button"
                disabled
                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 font-semibold text-xs inline-flex items-center gap-1.5 cursor-not-allowed opacity-75"
                title="Confirm appointment slot first before consultation"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Consult & Prescribe</span>
              </button>

              <Link
                to={`/doctor/patient-view?patientId=${row.patient_id}`}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
              >
                History
              </Link>
            </div>
          );
        }

        if (row.status === 'confirmed') {
          return (
            <div className="flex items-center gap-2">
              <Link
                to="/doctor/prescribe"
                state={{ appointment: row }}
                className="py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
                title="Conduct consultation and issue prescription"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Consult & Prescribe</span>
              </Link>
              <Link
                to={`/doctor/patient-view?patientId=${row.patient_id}`}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
              >
                History
              </Link>
            </div>
          );
        }

        if (row.status === 'completed') {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewingConsultationAppt(row)}
                className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View finalized consultation notes and prescribed medicines (Read-only)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Rx & Notes</span>
              </button>
              <Link
                to={`/doctor/patient-view?patientId=${row.patient_id}`}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
              >
                History
              </Link>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-500 font-medium">Slot Released</span>
            <Link
              to={`/doctor/patient-view?patientId=${row.patient_id}`}
              className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-colors"
            >
              History
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardShell role="doctor" title="Doctor Clinical Consultation Queue">
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

        {/* Doctor Identity Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20 shadow-inner">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold mb-1 border border-teal-400/30">
                <span>Active Consultation Desk</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {doctorDisplayName}
              </h2>
              <p className="text-xs text-teal-100 flex flex-wrap items-center gap-2 mt-0.5">
                <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                  Employee ID: {doctorAuth.user?.employee_id || 'DOC-2026-0001'}
                </span>
                <span>•</span>
                <span>{doctorAuth.user?.specialization || 'Consultant'}</span>
                <span>•</span>
                <span>Department: {doctorAuth.user?.department || 'Clinical Care'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 self-start md:self-auto">
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs inline-flex items-center gap-2 backdrop-blur-md shadow-xs transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-teal-200" />
              <span>Change Password</span>
            </button>
            <Link
              to="/doctor/availability"
              className="py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs inline-flex items-center gap-2 backdrop-blur-md shadow-xs transition-all"
            >
              <CalendarCheck className="w-4 h-4 text-teal-200" />
              <span>My Availability & Leaves</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Today's Patients"
            value={todayAppointments.length}
            subtitle={`Consultations scheduled for today (${todayStr})`}
            icon={CalendarDays}
            color="brand"
          />
          <StatCard
            title="Upcoming Consultations"
            value={upcomingAppointments.length}
            subtitle="Pending in upcoming queue"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Completed Consultations"
            value={completedAppointments.length}
            subtitle="Prescriptions finalized"
            icon={CheckCircle}
            color="emerald"
          />
        </div>

        {/* Queue Table with Filter Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Assigned Patient Consultation Queue</h3>
              <p className="text-xs text-slate-400">Flow: Pending (Accept) &rarr; Confirmed (Consult) &rarr; Completed (Finalized)</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Live Sync Active indicator & manual refresh */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                  <span>Live Sync</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadQueue(false)}
                  disabled={refreshing}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Refresh queue now"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'today'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Today ({todayAppointments.length})
                </button>
                <button
                  onClick={() => setFilterStatus('upcoming')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'upcoming'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Upcoming ({upcomingAppointments.length})
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'completed'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Completed ({completedAppointments.length})
                </button>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({appointments.length})
                </button>
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={displayedAppointments}
            emptyMessage={`No appointments found under "${filterStatus}" for ${doctorDisplayName}.`}
          />
        </div>

        {/* Completed Consultation Details (Read-only) Modal */}
        <Modal
          isOpen={!!viewingConsultationAppt}
          onClose={() => setViewingConsultationAppt(null)}
          title={`Completed Consultation Record — #${viewingConsultationAppt?.id}`}
          maxWidth="max-w-2xl"
        >
          {viewingConsultationAppt && (
            <div className="space-y-5">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Consultation Completed &amp; Prescriptions Finalized</span>
                </div>
                <span className="text-[11px] text-emerald-700 bg-white/70 px-2.5 py-0.5 rounded-full border border-emerald-300 font-semibold">
                  Read-Only (Locked)
                </span>
              </div>

              {/* Patient info box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Patient Name</span>
                  <span className="font-bold text-slate-800 text-sm">{viewingConsultationAppt.patient?.name || 'Walk-in'}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">ID: {viewingConsultationAppt.patient?.patient_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Appointment Date &amp; Slot</span>
                  <span className="font-bold text-slate-800">{viewingConsultationAppt.appointment_date}</span>
                  <span className="block text-brand-600 font-bold">{viewingConsultationAppt.time_slot}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Completed Timestamp</span>
                  <span className="font-medium text-slate-800">
                    {viewingConsultationAppt.completed_at
                      ? new Date(viewingConsultationAppt.completed_at).toLocaleString()
                      : 'Recorded during consultation'}
                  </span>
                </div>
              </div>

              {/* Diagnosis notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-brand-600" />
                  <span>Clinical Assessment &amp; Diagnosis Notes</span>
                </label>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {viewingConsultationAppt.consultation_notes ||
                    viewingConsultationAppt.consultation?.diagnosis_notes ||
                    'Clinical consultation was conducted and completed.'}
                </div>
              </div>

              {/* Prescribed medicines list if available */}
              {viewingConsultationAppt.consultation?.prescriptions?.[0]?.items?.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-brand-600" />
                    <span>Prescribed Medications</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 font-semibold">Medicine</th>
                          <th className="p-2.5 font-semibold">Dosage</th>
                          <th className="p-2.5 font-semibold">Schedule / Frequency</th>
                          <th className="p-2.5 font-semibold text-center">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingConsultationAppt.consultation.prescriptions[0].items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{it.medicine?.name || `Medicine #${it.medicine_id}`}</td>
                            <td className="p-2.5 text-slate-600">{it.dosage}</td>
                            <td className="p-2.5 text-slate-600">{it.frequency || 'As directed'}</td>
                            <td className="p-2.5 text-center font-bold text-brand-600">{it.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Edits are permanently disabled for finalized consultations to protect medical record audit integrity.</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingConsultationAppt(null)}
                  className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Record
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

export default DoctorDashboard;

