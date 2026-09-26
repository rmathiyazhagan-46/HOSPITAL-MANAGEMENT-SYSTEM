import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import { applyDoctorLeave, getMyLeaves } from '../../services/doctorLeaveService';
import { Calendar, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';

const DoctorLeaveApply = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    reason: ''
  });
  const [submitState, setSubmitState] = useState({ loading: false, error: null, success: null });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await getMyLeaves();
      setLeaves(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState({ loading: true, error: null, success: null });
    
    if (new Date(formData.to_date) < new Date(formData.from_date)) {
      setSubmitState({ loading: false, error: 'To Date cannot be earlier than From Date.', success: null });
      return;
    }

    try {
      await applyDoctorLeave(formData);
      setSubmitState({ loading: false, error: null, success: 'Leave request submitted successfully. Awaiting admin approval.' });
      setFormData({ from_date: '', to_date: '', reason: '' });
      fetchLeaves();
      window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
      localStorage.setItem('doctor_availability_updated', Date.now().toString());
      setTimeout(() => setSubmitState(s => ({ ...s, success: null })), 3000);
    } catch (err) {
      setSubmitState({ 
        loading: false, 
        error: err.response?.data?.message || 'Failed to apply for leave.', 
        success: null 
      });
    }
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'Approved': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'Rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><XCircle className="w-3 h-3" /> Rejected</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <DashboardShell role="doctor" title="Leave Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Apply Leave Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                Apply for Leave
              </h3>
            </div>
            <div className="p-5">
              {submitState.error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                  {submitState.error}
                </div>
              )}
              {submitState.success && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">
                  {submitState.success}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    name="from_date"
                    value={formData.from_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    name="to_date"
                    value={formData.to_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
                    placeholder="Enter reason for leave"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={submitState.loading}
                  className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitState.loading ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Leave History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-500" />
                Leave History
              </h3>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium border-b border-slate-200">Date Range</th>
                      <th className="px-5 py-3 font-medium border-b border-slate-200">Reason</th>
                      <th className="px-5 py-3 font-medium border-b border-slate-200">Applied On</th>
                      <th className="px-5 py-3 font-medium border-b border-slate-200">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-slate-500">Loading history...</td>
                      </tr>
                    ) : leaves.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-8 text-center text-slate-500">No leave history found.</td>
                      </tr>
                    ) : (
                      leaves.map(leave => (
                        <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-medium text-slate-700">{leave.from_date}</span>
                            <span className="mx-2 text-slate-400">to</span>
                            <span className="font-medium text-slate-700">{leave.to_date}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-600 max-w-[200px] truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {new Date(leave.applied_at || leave.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            {renderStatus(leave.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
};

export default DoctorLeaveApply;
