import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Download, 
  Loader2,
  FileText, 
  Filter, 
  TrendingUp, 
  PieChart as PieIcon,
  Calendar,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  QrCode,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import {
  getRevenueStats, 
  getAllInvoicesList,
  confirmInvoicePayment,
  rejectInvoicePayment,
  downloadAdminInvoicePdf,
} from '../../services/adminAuthService';
import api from '../../services/api';

const DEPARTMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const BillingRevenue = () => {
  const [data, setData] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    totalInvoices: 0,
    breakdown: {},
    departmentBreakdown: [],
    monthlyTrend: [],
    dailyTrend: [],
  });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [revenueRes, invoicesRes] = await Promise.all([
        getRevenueStats(params),
        getAllInvoicesList(params),
      ]);

      setData(revenueRes?.data || {});
      setInvoices(invoicesRes?.data || []);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, statusFilter]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDownloadPdf = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      await downloadAdminInvoicePdf(invoiceId);
      setToast({ type: 'success', message: `Invoice #${invoiceId} downloaded successfully.` });
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      setToast({ type: 'error', message: 'Failed to download invoice PDF. Please try again.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerifyPayment = async (id) => {
    if (!window.confirm(`Are you sure you want to confirm payment for Invoice #${id}?`)) return;
    try {
      setLoading(true);
      await confirmInvoicePayment(id);
      setToast({ type: 'success', message: `Payment for Invoice #${id} confirmed successfully.` });
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to confirm payment.' });
      setLoading(false);
    }
  };

  const handleRejectPayment = async (id) => {
    if (!window.confirm(`Are you sure you want to reject payment for Invoice #${id}?`)) return;
    try {
      setLoading(true);
      await rejectInvoicePayment(id, 'Payment not received in hospital bank account.');
      setToast({ type: 'success', message: `Payment for Invoice #${id} rejected.` });
      loadData();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to reject payment.' });
      setLoading(false);
    }
  };

  // Columns for All Invoices Ledger
  const ledgerColumns = [
    { 
      header: 'Invoice #', 
      accessor: 'id', 
      render: (row) => (
        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
          #{row.id.toString().padStart(6, '0')}
        </span>
      ) 
    },
    {
      header: 'Patient Details',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.patient?.name || 'Walk-in / External'}</p>
          <p className="text-xs text-slate-400 font-mono">
            {row.patient?.patient_id ? `ID: ${row.patient.patient_id}` : row.patient?.phone || ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Invoice Type',
      accessor: 'invoice_type',
      render: (row) => <span className="capitalize font-medium text-xs text-slate-700">{row.invoice_type}</span>,
    },
    { 
      header: 'Billed Amount', 
      render: (row) => (
        <span className="font-semibold text-slate-900">
          ₹{Number(row.amount).toFixed(2)}
        </span>
      ) 
    },
    {
      header: 'Payment Status',
      render: (row) => {
        if (row.status === 'paid') {
          return <Badge variant="success">PAID</Badge>;
        }
        if (row.status === 'pending_verification') {
          return <Badge variant="orange">PENDING VERIFICATION</Badge>;
        }
        return <Badge variant="warning">PENDING</Badge>;
      },
    },
    { 
      header: 'Date Created', 
      render: (row) => new Date(row.createdAt).toLocaleDateString() 
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending_verification' && (
            <>
              <button
                onClick={() => handleVerifyPayment(row.id)}
                className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 text-xs shadow-xs font-semibold"
                title="Confirm Payment Received"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
              <button
                onClick={() => handleRejectPayment(row.id)}
                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors inline-flex items-center gap-1 text-xs shadow-xs font-semibold"
                title="Reject Payment"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}
          <button
            onClick={() => handleDownloadPdf(row.id)}
            disabled={downloadingId === row.id}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-brand-50 hover:border-brand-300 text-brand-600 transition-all inline-flex items-center gap-1 text-xs shadow-xs disabled:opacity-50"
            title="Download Official Tax Invoice"
          >
            {downloadingId === row.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>PDF</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell role="admin" title="Hospital Revenue Intelligence & Billing Ledger">
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
            title="Hospital Revenue"
            value={`₹${(data.totalRevenue || 0).toLocaleString()}`}
            subtitle={`${data.paidCount || 0} confirmed collections`}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Pending Payments"
            value={`₹${(data.pendingAmount || 0).toLocaleString()}`}
            subtitle={`${data.pendingCount || 0} unpaid or in verification`}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Consultation Fees"
            value={`₹${(data.breakdown?.consultation || 0).toLocaleString()}`}
            subtitle="OPD & Specialist visits"
            icon={DollarSign}
            color="brand"
          />
          <StatCard
            title="Pharmacy Revenue"
            value={`₹${(data.breakdown?.pharmacy || 0).toLocaleString()}`}
            subtitle="Dispensary collections"
            icon={FileText}
            color="purple"
          />
        </div>

        {/* All Invoices Ledger Tab Content */}
        <div className="space-y-4 pt-6">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hospital-Wide Invoices Ledger</h3>
              <p className="text-xs text-slate-400">Official GST-compliant billing records across all departments</p>
            </div>

            <DataTable
              columns={ledgerColumns}
              data={invoices}
              emptyMessage="No billing ledger entries match the selected filters."
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default BillingRevenue;
