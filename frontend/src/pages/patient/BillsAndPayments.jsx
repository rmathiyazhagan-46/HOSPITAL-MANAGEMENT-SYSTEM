import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import DashboardShell from '../../components/layout/DashboardShell';
import DataTable from '../../components/shared/DataTable';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import {
  Download,
  CheckCircle2,
  QrCode,
  FileText,
  Pill,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Receipt,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import {
  getPatientInvoices,
  getInvoiceUpiQr,
  downloadInvoicePdf,
  getInvoiceStatus,
  markInvoicePaid,
} from '../../services/patientAuthService';

const BillsAndPayments = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedBreakdownInvoice, setSelectedBreakdownInvoice] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Keep track of pending verification IDs to detect real-time confirmation from admin
  const previousPendingIdsRef = useRef(new Set());

  const loadInvoices = async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setLoading(true);
      const res = await getPatientInvoices();
      const updatedList = res?.data || [];
      
      // Check if any invoice transitioned from pending_verification to paid
      if (isBackgroundPoll && previousPendingIdsRef.current.size > 0) {
        updatedList.forEach((inv) => {
          if (previousPendingIdsRef.current.has(inv.id) && inv.status === 'paid') {
            setToast({
              type: 'success',
              message: `Payment confirmed! Your payment of ₹${Number(inv.amount).toFixed(2)} for Invoice #${inv.id} has been confirmed.`,
            });
            previousPendingIdsRef.current.delete(inv.id);

            // Automatically switch open QR modal to the Payment Successful confirmation view
            setSelectedInvoice((prev) => {
              if (prev && prev.id === inv.id) {
                setIsQrModalOpen(false);
                setIsReceiptModalOpen(true);
                return inv;
              }
              return prev;
            });
          }
        });
      }

      // Update the pending set
      const currentPending = new Set(
        updatedList.filter((inv) => inv.status === 'pending_verification').map((inv) => inv.id)
      );
      previousPendingIdsRef.current = currentPending;

      setInvoices(updatedList);
    } catch (err) {
      if (!isBackgroundPoll) {
        console.error('Failed to load patient invoices:', err);
      }
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Real-time polling: Check for admin confirmation every 4 seconds when an invoice is awaiting verification
  useEffect(() => {
    const hasPendingVerification = invoices.some((inv) => inv.status === 'pending_verification');
    if (!hasPendingVerification) return;

    const interval = setInterval(() => {
      loadInvoices(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [invoices]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Removed webhook polling logic, reverting to manual confirm.

  // Check verification status if patient re-checks or clicks pending verification
  const handleCheckVerificationStatus = async (inv) => {
    try {
      setLoading(true);
      const res = await getPatientInvoices();
      const updatedList = res?.data || [];
      setInvoices(updatedList);
      const current = updatedList.find((item) => item.id === inv.id) || inv;

      if (current.status === 'paid') {
        setSelectedInvoice(current);
        setIsQrModalOpen(false);
        setIsReceiptModalOpen(true);
        setToast({
          type: 'success',
          message: `Payment confirmed! Your payment of ₹${Number(current.amount).toFixed(2)} for Invoice #${current.id} has been confirmed.`,
        });
      } else {
        setSelectedInvoice(current);
        setIsQrModalOpen(true);
        setToast({
          type: 'orange',
          message: `Invoice #${current.id} is pending verification. Hospital accounts will confirm shortly.`,
        });
      }
    } catch (err) {
      console.error('Failed to check invoice status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      setIsSubmitting(true);
      await markInvoicePaid(selectedInvoice.id);
      
      setToast({
        type: 'success',
        message: 'Payment submitted. Waiting for hospital confirmation.',
      });
      
      const res = await getPatientInvoices();
      setInvoices(res?.data || []);
      
      setSelectedInvoice((prev) => ({ ...prev, status: 'pending_verification' }));
    } catch (err) {
      setToast({
        type: 'error',
        message: 'Could not submit payment verification. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open dynamic QR code modal for an invoice
  const handleOpenQrModal = async (inv) => {
    // If invoice is already paid, always show payment confirmation view instead of QR
    if (inv.status === 'paid') {
      setSelectedInvoice(inv);
      setIsReceiptModalOpen(true);
      return;
    }

    // If reopening an invoice that was marked pending_verification, verify latest status
    if (inv.status === 'pending_verification') {
      await handleCheckVerificationStatus(inv);
      return;
    }

    setSelectedInvoice(inv);
    setIsQrModalOpen(true);
    setQrLoading(true);
    setQrCodeDataUrl('');

    try {
      const res = await getInvoiceUpiQr(inv.id);
      if (res?.data?.qr_data_url) {
        setQrCodeDataUrl(res.data.qr_data_url);
      } else {
        throw new Error("Did not receive a valid QR code.");
      }
    } catch (apiErr) {
      console.error('Failed to generate payment link QR code:', apiErr);
      setToast({
        type: 'error',
        message: apiErr.response?.data?.message || 'Could not connect to payment gateway. Please try again.',
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleOpenPaidReceipt = (inv) => {
    setSelectedInvoice(inv);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadPdf = async (invId) => {
    try {
      await downloadInvoicePdf(invId);
    } catch (err) {
      setToast({
        type: 'error',
        message: 'Could not download invoice PDF. Please try again.',
      });
    }
  };

  const columns = [
    { 
      header: 'Invoice #', 
      accessor: 'id', 
      render: (row) => `#${row.id.toString().padStart(5, '0')}` 
    },
    {
      header: 'Service Item',
      accessor: 'invoice_type',
      render: (row) => (
        <div>
          <span className="capitalize font-semibold text-slate-800">
            {row.invoice_type === 'pharmacy' ? 'Pharmacy Prescription Bill' : row.invoice_type === 'combined' ? 'Combined Consultation & Pharmacy Bill' : `${row.invoice_type} Consultation Fee`}
          </span>
          {(row.invoice_type === 'pharmacy' || row.invoice_type === 'combined') && row.prescription?.items?.length ? (
            <span className="text-[10px] text-brand-600 font-medium block">
              {row.prescription.items.length} prescribed medicine{row.prescription.items.length > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      ),
    },
    { 
      header: 'Total Payable', 
      render: (row) => (
        <span className="font-bold text-slate-900">
          ₹{Number(row.amount).toFixed(2)}
        </span>
      ) 
    },
    {
      header: 'Status',
      render: (row) => {
        if (row.status === 'paid') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>PAID</span>
            </span>
          );
        }
        if (row.status === 'pending_verification') {
          return (
            <Badge variant="orange" className="animate-pulse">
              PENDING VERIFICATION
            </Badge>
          );
        }
        return <Badge variant="warning">PENDING</Badge>;
      },
    },
    { 
      header: 'Date', 
      render: (row) => new Date(row.createdAt).toLocaleDateString() 
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.invoice_type === 'pharmacy' && row.prescription?.items?.length > 0 && (
            <button
              onClick={() => setSelectedBreakdownInvoice(row)}
              className="py-1 px-2.5 rounded-lg border border-brand-200 hover:bg-brand-50 text-brand-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="View Prescribed Items Breakdown"
            >
              <FileText className="w-3.5 h-3.5 text-brand-600" />
              <span>Breakdown</span>
            </button>
          )}

          {row.status === 'pending' ? (
            <button
              onClick={() => handleOpenQrModal(row)}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Pay via QR</span>
            </button>
          ) : row.status === 'pending_verification' ? (
            <button
              onClick={() => handleCheckVerificationStatus(row)}
              className="text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
              title="Click to check if verified"
            >
              <Clock className="w-3 h-3 animate-pulse text-amber-600" />
              <span>Verification Pending</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenPaidReceipt(row)}
              className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="Click to view payment confirmation"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>✓ Paid</span>
            </button>
          )}

          <button
            onClick={() => handleDownloadPdf(row.id)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-brand-50 text-brand-600 text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="Download Official Tax Invoice PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell role="patient" title="Bills & Hospital Invoices">
      <div className="space-y-6">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'orange'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : toast.type === 'orange' ? (
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
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

        <div>
          <h3 className="font-bold text-slate-800 text-base">Invoices & Settlement History</h3>
          <p className="text-xs text-slate-400">
            Review consultation and pharmacy bills. Scan the dynamic UPI QR code to pay with the exact amount pre-filled in your UPI app.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={invoices}
          emptyMessage="No invoices generated for your account yet."
        />

        {/* Itemized Medicine Breakdown Modal */}
        <Modal
          isOpen={Boolean(selectedBreakdownInvoice)}
          onClose={() => setSelectedBreakdownInvoice(null)}
          title="Pharmacy Prescription Bill Breakdown"
          maxWidth="max-w-2xl"
        >
          {selectedBreakdownInvoice && (
            <div className="space-y-4 text-xs">
              {/* Header Info */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Number</span>
                  <span className="font-bold text-slate-800 text-sm">
                    #{selectedBreakdownInvoice.id.toString().padStart(5, '0')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prescribing Doctor</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedBreakdownInvoice.consultation?.doctor?.name || selectedBreakdownInvoice.prescription?.doctor?.name || 'Attending Physician'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Status</span>
                  <span className="pt-0.5 inline-block">
                    {selectedBreakdownInvoice.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>PAID</span>
                      </span>
                    ) : selectedBreakdownInvoice.status === 'pending_verification' ? (
                      <Badge variant="orange">PENDING VERIFICATION</Badge>
                    ) : (
                      <Badge variant="warning">PENDING</Badge>
                    )}
                  </span>
                </div>
              </div>

              {/* Medicines Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/70 p-2.5 font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200">
                  <Pill className="w-4 h-4 text-brand-600" />
                  <span>Itemized Prescribed Medicines</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                      <tr>
                        <th className="p-2.5 font-semibold">Medicine & Instructions</th>
                        <th className="p-2.5 font-semibold text-center">Qty Prescribed</th>
                        <th className="p-2.5 font-semibold text-right">Unit Price</th>
                        <th className="p-2.5 font-semibold text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBreakdownInvoice.invoice_type === 'combined' && (
                        <tr className="hover:bg-slate-50/50 bg-blue-50/30">
                          <td className="p-2.5">
                            <p className="font-bold text-slate-800">
                              Doctor Consultation Fee
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {selectedBreakdownInvoice.consultation?.doctor?.specialization || 'General Consultation'}
                            </p>
                          </td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">
                            1 session
                          </td>
                          <td className="p-2.5 text-right font-medium text-slate-600">
                            ₹{Number(selectedBreakdownInvoice.consultation?.doctor?.consultation_fee || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-brand-700">
                            ₹{Number(selectedBreakdownInvoice.consultation?.doctor?.consultation_fee || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {selectedBreakdownInvoice.prescription?.items?.map((item) => {
                        const qty = Number(item.quantity) || 1;
                        const unit = Number(item.unit_price) || Number(item.medicine?.unit_price) || 0;
                        const line = qty * unit;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <p className="font-bold text-slate-800">
                                {item.medicine?.name || 'Medicine'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.dosage} • {item.frequency} • {item.duration}
                              </p>
                            </td>
                            <td className="p-2.5 text-center font-semibold text-slate-700">
                              {qty} unit{qty > 1 ? 's' : ''}
                            </td>
                            <td className="p-2.5 text-right font-medium text-slate-600">
                              ₹{unit.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-brand-700">
                              ₹{line.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Action Footer */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Total Amount Payable
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    ₹{Number(selectedBreakdownInvoice.amount).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(selectedBreakdownInvoice.id)}
                    className="py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  {selectedBreakdownInvoice.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(selectedBreakdownInvoice)}
                      className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pay via QR</span>
                    </button>
                  ) : selectedBreakdownInvoice.status === 'pending_verification' ? (
                    <button
                      type="button"
                      onClick={() => handleCheckVerificationStatus(selectedBreakdownInvoice)}
                      className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Click to check verification status"
                    >
                      <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                      <span>Check Verification Status</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPaidReceipt(selectedBreakdownInvoice)}
                      className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>View Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Dynamic UPI QR Payment Modal */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title={selectedInvoice?.status === 'pending_verification' ? 'Payment Verification' : 'Pay via UPI QR Code'}
          maxWidth="max-w-md"
        >
          {selectedInvoice && (
            <div className="space-y-4 text-xs text-center">
              {/* Exact Amount Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 via-blue-50/60 to-purple-50/40 border border-brand-100 space-y-1">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  {selectedInvoice.status === 'pending_verification' ? 'Submitted Payment Amount' : 'Exact Bill Amount to Pay'}
                </span>
                <p className="text-3xl font-black text-slate-900 tracking-tight">
                  ₹{Number(selectedInvoice.amount).toFixed(2)}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600 text-[11px] font-medium">
                  <span>Invoice #{selectedInvoice.id}</span>
                  <span>•</span>
                  <span className="font-semibold text-brand-700">{selectedInvoice.invoice_type.toUpperCase()}</span>
                </div>
              </div>

              {/* If invoice was already submitted as I've Paid, show pending verification status card */}
              {selectedInvoice.status === 'pending_verification' ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Payment Verification Pending</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      You marked this invoice as paid. Hospital accounts is reviewing and verifying the payment.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCheckVerificationStatus(selectedInvoice)}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Check Latest Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dynamic QR Code Canvas / Image */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block relative">
                    {qrLoading ? (
                      <div className="w-60 h-60 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium">Generating Dynamic QR...</span>
                      </div>
                    ) : qrCodeDataUrl ? (
                      <div className="space-y-2">
                        <img
                          src={qrCodeDataUrl}
                          alt={`Dynamic UPI QR for Invoice #${selectedInvoice.id}`}
                          className="w-60 h-60 object-contain rounded-xl mx-auto border border-slate-100"
                        />
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Pre-filled Amount: ₹{Number(selectedInvoice.amount).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-60 h-60 flex items-center justify-center text-rose-500 font-medium text-xs">
                        Could not generate QR code.
                      </div>
                    )}
                  </div>

                  {/* Step-by-step Instructions */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5 text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>How to Pay:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                      <li>Scan this QR using your phone's camera or a UPI app (<strong>PhonePe, Google Pay, Paytm</strong>).</li>
                      <li>It will securely open the hospital's Razorpay gateway.</li>
                      <li>The exact amount (<strong>₹{Number(selectedInvoice.amount).toFixed(2)}</strong>) will be pre-filled. Complete the payment to proceed.</li>
                    </ol>
                  </div>

                  {/* Manual Payment Confirmation Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleMarkPaid}
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : "I've Paid"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(false)}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                    >
                      Cancel / Back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>

        {/* Clear "Payment Successful" Confirmation View Modal */}
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Payment Successful"
          maxWidth="max-w-md"
        >
          {selectedInvoice && (
            <div className="space-y-4 text-xs text-center py-2">
              {/* Green Success Checkmark */}
              <div className="w-16 h-16 bg-emerald-100 border-4 border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Successful</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Your payment has been verified and confirmed by hospital accounts.
                </p>
              </div>

              {/* Settlement Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Invoice Number:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    #{selectedInvoice.id.toString().padStart(5, '0')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Service Item:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {selectedInvoice.invoice_type === 'pharmacy' ? 'Pharmacy Prescription Bill' : `${selectedInvoice.invoice_type} Consultation Fee`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Amount Paid:</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    ₹{Number(selectedInvoice.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Payment Date:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedInvoice.payments?.[0]?.paid_at 
                      ? new Date(selectedInvoice.payments[0].paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : new Date(selectedInvoice.updatedAt || selectedInvoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Payment Mode:</span>
                  <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-brand-600" />
                    <span>UPI QR Transfer</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2.5">
                  <span className="font-medium">Settlement Status:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                    <span>✓ PAID</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedInvoice.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardShell>
  );
};

export default BillsAndPayments;
