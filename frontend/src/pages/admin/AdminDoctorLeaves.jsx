import React, { useState, useEffect, useMemo } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/shared/Badge';
import { 
  getAllDoctorLeaves, 
  approveDoctorLeave, 
  rejectDoctorLeave, 
  adminApplyDoctorLeave 
} from '../../services/doctorLeaveService';
import { getDoctorsList } from '../../services/adminAuthService';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Check, 
  X, 
  Search, 
  Filter, 
  AlertCircle, 
  Plus, 
  Loader2, 
  Stethoscope, 
  AlertTriangle,
  RotateCw,
  FileText
} from 'lucide-react';

const AdminDoctorLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  // Status Filter: default to 'Pending' per requirement
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Apply Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [formData, setFormData] = useState({
    doctor_id: '',
    from_date: '',
    to_date: '',
    reason: ''
  });

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchLeaves();
    fetchDoctors();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await getAllDoctorLeaves();
      setLeaves(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch doctor leaves:', err);
      setToast({ type: 'error', message: 'Failed to fetch doctor leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await getDoctorsList();
      setDoctors(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch doctors list:', err);
    }
  };

  // Approve / Reject Handler
  const handleAction = async (leave, action) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    const doctorName = leave.doctor?.name || 'Doctor';
    if (!window.confirm(`Are you sure you want to ${actionText} the leave request for ${doctorName}?`)) {
      return;
    }

    setActionLoading(`${leave.id}-${action}`);
    try {
      if (action === 'approve') {
        await approveDoctorLeave(leave.id);
        setToast({ 
          type: 'success', 
          message: `Leave request for ${doctorName} has been approved.` 
        });
      } else {
        await rejectDoctorLeave(leave.id);
        setToast({ 
          type: 'success', 
          message: `Leave request for ${doctorName} has been rejected.` 
        });
      }

      // Sync across app and refresh
      window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
      localStorage.setItem('doctor_availability_updated', Date.now().toString());
      await fetchLeaves();
    } catch (err) {
      console.error(`Failed to ${actionText} leave:`, err);
      setToast({ 
        type: 'error', 
        message: err.response?.data?.message || `Failed to ${actionText} leave request.` 
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Admin Apply Leave
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setModalError(null);
    try {
      await adminApplyDoctorLeave(formData);
      setIsModalOpen(false);
      setFormData({ doctor_id: '', from_date: '', to_date: '', reason: '' });
      setToast({ type: 'success', message: 'Leave record created and approved successfully.' });
      window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
      localStorage.setItem('doctor_availability_updated', Date.now().toString());
      await fetchLeaves();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setApplyLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      // 1. Status Filter
      if (statusFilter !== 'All' && leave.status !== statusFilter) {
        return false;
      }
      // 2. Search Query (Doctor name, dept, reason, employee_id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docName = leave.doctor?.name?.toLowerCase() || '';
        const dept = leave.doctor?.department?.name?.toLowerCase() || '';
        const empId = leave.doctor?.employee_id?.toLowerCase() || '';
        const reason = leave.reason?.toLowerCase() || '';
        return docName.includes(q) || dept.includes(q) || empId.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [leaves, statusFilter, searchQuery]);

  // Calculate day duration
  const getDurationDays = (from, to) => {
    if (!from || !to) return '';
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <DashboardShell role="admin" title="Doctor Leave Requests & Approvals">
      <div className="space-y-6">

        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Pending Approvals"
            value={stats.pending}
            subtitle="Requires immediate admin decision"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Approved Leaves"
            value={stats.approved}
            subtitle="Doctors actively on leave"
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Rejected Requests"
            value={stats.rejected}
            subtitle="Declined leave applications"
            icon={XCircle}
            color="rose"
          />
          <StatCard
            title="Total Applications"
            value={stats.total}
            subtitle="All-time hospital leave records"
            icon={Calendar}
            color="brand"
          />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card Header & Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                Doctor Leave Requests Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review, approve, or reject clinical leave submissions to maintain hospital duty coverage
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchLeaves}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh list"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setModalError(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Apply Leave</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Filter Tabs (Pending by default) */}
            <div className="inline-flex p-1 bg-slate-200/70 rounded-xl gap-1">
              {[
                { label: 'Pending', value: 'Pending', count: stats.pending },
                { label: 'All', value: 'All', count: stats.total },
                { label: 'Approved', value: 'Approved', count: stats.approved },
                { label: 'Rejected', value: 'Rejected', count: stats.rejected },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    statusFilter === tab.value
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === tab.value
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-300/60 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor, dept, reason..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3.5">Doctor</th>
                  <th className="px-5 py-3.5">From Date</th>
                  <th className="px-5 py-3.5">To Date</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Applied On</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                        <span className="font-medium">Loading leave requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-700 text-sm">No leave requests found</span>
                        <p className="text-xs text-slate-400">
                          {statusFilter === 'Pending'
                            ? 'All caught up! There are no pending doctor leave requests awaiting approval.'
                            : 'No leave records match the selected status or search filter.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((leave) => {
                    const isApproveLoading = actionLoading === `${leave.id}-approve`;
                    const isRejectLoading = actionLoading === `${leave.id}-reject`;
                    const isRowBusy = isApproveLoading || isRejectLoading;

                    return (
                      <tr 
                        key={leave.id} 
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Doctor Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {leave.doctor?.name ? leave.doctor.name.replace('Dr. ', '').charAt(0) : 'D'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">
                                {leave.doctor?.name || 'Assigned Physician'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>{leave.doctor?.department?.name || 'General Medicine'}</span>
                                {leave.doctor?.employee_id && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {leave.doctor.employee_id}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* From Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{leave.from_date}</span>
                          </div>
                        </td>

                        {/* To Date */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{leave.to_date}</span>
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">
                              {getDurationDays(leave.from_date, leave.to_date)}
                            </span>
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="px-5 py-4 max-w-[240px]">
                          <div 
                            className="text-slate-600 line-clamp-2 leading-relaxed" 
                            title={leave.reason}
                          >
                            {leave.reason || <span className="text-slate-400 italic">No reason specified</span>}
                          </div>
                        </td>

                        {/* Applied On date */}
                        <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {leave.applied_at || leave.createdAt
                                ? new Date(leave.applied_at || leave.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getStatusBadge(leave.status)}
                        </td>

                        {/* Actions: Approve & Reject */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {leave.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* Approve Button */}
                              <button
                                onClick={() => handleAction(leave, 'approve')}
                                disabled={isRowBusy}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                                title="Approve Leave Request"
                              >
                                {isApproveLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Approve</span>
                              </button>

                              {/* Reject Button */}
                              <button
                                onClick={() => handleAction(leave, 'reject')}
                                disabled={isRowBusy}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                                title="Reject Leave Request"
                              >
                                {isRejectLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end text-xs text-slate-400 font-medium">
                              {leave.status === 'Approved' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50/60 px-2 py-1 rounded-md border border-emerald-100">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approved</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-500 bg-rose-50/60 px-2 py-1 rounded-md border border-rose-100">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Record Doctor Leave</h3>
                <p className="text-xs text-slate-400">Admin direct leave registration with automatic approval</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleApplyLeave} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Doctor *</label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.from_date}
                    onChange={(e) => setFormData({...formData, from_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.to_date}
                    min={formData.from_date}
                    onChange={(e) => setFormData({...formData, to_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows="3"
                  placeholder="e.g. Medical conference, personal leave..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                >
                  {applyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{applyLoading ? 'Registering...' : 'Register Leave'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminDoctorLeaves;
