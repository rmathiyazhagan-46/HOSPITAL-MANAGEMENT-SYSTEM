import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  ArrowRight, 
  Download, 
  CalendarPlus, 
  Copy, 
  Check, 
  MapPin, 
  AlertCircle,
  RotateCw,
  QrCode,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import api from '../../services/api';

const ConfirmationScreen = ({ appointment, onReset, onSwitchDoctor }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [isPaying, setIsPaying] = useState(false);
  const [paidStatus, setPaidStatus] = useState(appointment?.invoice?.status === 'paid');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const appointmentId = appointment?.id || 'APPT-PENDING';
  const doctorName = appointment?.doctor?.name || appointment?.doctorName || 'Assigned Specialist';
  const departmentName = appointment?.doctor?.department || appointment?.department || 'General Medicine';
  const appointmentDate = appointment?.appointment_date || new Date().toISOString().split('T')[0];
  const timeSlot = appointment?.time_slot || '10:00 AM';
  const consultationAmount = Number(appointment?.invoice?.amount ?? appointment?.doctor?.consultation_fee ?? 0);

  const handleCopyId = () => {
    navigator.clipboard.writeText(String(appointmentId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayNow = async () => {
    if (!appointment?.invoice?.id) {
      alert('Invoice not found.');
      return;
    }
    try {
      setIsPaying(true);
      await api.post('/billing/pay', {
        invoice_id: appointment.invoice.id,
        amount_paid: consultationAmount,
        payment_mode: paymentMode,
      });
      setPaidStatus(true);
      setIsPayModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (isPayModalOpen && paymentMode === 'upi') {
      let isMounted = true;
      const generateQr = async () => {
        setQrLoading(true);
        try {
          if (appointment?.invoice?.id) {
            try {
              const res = await api.get(`/billing/invoice/${appointment.invoice.id}/upi-qr`);
              if (res.data?.data?.qr_data_url && isMounted) {
                setQrCodeDataUrl(res.data.data.qr_data_url);
                setQrLoading(false);
                return;
              }
            } catch (backendErr) {
              console.warn('Backend QR fetch failed, generating dynamic QR client-side:', backendErr);
            }
          }

          const upiId = import.meta.env.VITE_HOSPITAL_UPI_ID || 'gangaganga2235@oksbi';
          const payeeName = import.meta.env.VITE_HOSPITAL_NAME || 'Metro General Apex Hospital';
          const amount = consultationAmount.toFixed(2);
          const note = `Consultation Fee - Dr. ${doctorName}`;

          const params = new URLSearchParams({
            pa: upiId,
            pn: payeeName,
            am: amount,
            cu: 'INR',
            tn: note,
          });
          const upiUrl = `upi://pay?${params.toString()}`;

          const dataUrl = await QRCode.toDataURL(upiUrl, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 240,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });

          if (isMounted) {
            setQrCodeDataUrl(dataUrl);
          }
        } catch (err) {
          console.error('Failed to generate consultation QR code:', err);
        } finally {
          if (isMounted) {
            setQrLoading(false);
          }
        }
      };

      generateQr();
      return () => {
        isMounted = false;
      };
    }
  }, [isPayModalOpen, paymentMode, appointment, doctorName]);

  // Generate and trigger RFC-5545 .ics calendar download
  const handleAddToCalendar = () => {
    // Parse time slot to construct approximate start and end ISO strings
    // Time slots like "09:00 AM" or "02:30 PM"
    let [timePart, modifier] = timeSlot.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const startDate = new Date(appointmentDate);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 min duration

    const formatIcsDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startStr = formatIcsDate(startDate);
    const endStr = formatIcsDate(endDate);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PulseCare Hospital//Appointment Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:appt-${appointmentId}-${Date.now()}@pulsecare.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Medical Consultation with Dr. ${doctorName} (${departmentName})`,
      `DESCRIPTION:Appointment ID: #${appointmentId}\\nDoctor: Dr. ${doctorName}\\nDepartment: ${departmentName}\\nHospital: PulseCare Medical Center\\nPlease arrive 15 minutes prior to your scheduled time slot with any prior medical records.`,
      'LOCATION:PulseCare Hospital & Research Centre, OPD Wing, 100 Hospital Way',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Appointment_${appointmentId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download PDF confirmation from backend API
  const handleDownloadPdf = async () => {
    if (!appointment?.id) return;
    try {
      setDownloadingPdf(true);
      setPdfError('');
      const response = await api.get(`/appointments/${appointment.id}/confirmation-pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `PulseCare_Appointment_${appointment.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF confirmation:', err);
      setPdfError('Could not download confirmation slip. Please check your network or try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-center max-w-xl mx-auto shadow-xl shadow-slate-100/60">
      {/* Status Icon */}
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border shadow-inner ${
        appointment?.status === 'pending'
          ? 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 border-amber-200'
          : 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600 border-emerald-200'
      }`}>
        {appointment?.status === 'pending' ? <Clock className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
        appointment?.status === 'pending'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-800'
      }`}>
        <span className={`w-2 h-2 rounded-full ${appointment?.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
        {appointment?.status === 'pending' ? 'Booking Reserved (Pending Confirmation)' : 'Booking Confirmed & Queued'}
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        {appointment?.status === 'pending' ? 'Appointment Booking Received!' : 'Appointment Confirmed!'}
      </h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
        {appointment?.status === 'pending'
          ? 'Your consultation slot is reserved in stage "Pending". The doctor or receptionist will confirm the appointment shortly.'
          : 'Your consultation has been confirmed. A confirmation slip has been generated for hospital entry.'}
      </p>


      {/* Details Box */}
      <div className="bg-slate-50 rounded-2xl p-5 text-left text-sm space-y-3.5 border border-slate-200/80 mb-6">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-slate-500 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Consulting Doctor
          </span>
          <span className="font-bold text-slate-800 text-right">Dr. {doctorName}</span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-slate-500 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Department
          </span>
          <span className="font-medium text-slate-700">{departmentName}</span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Scheduled Date
          </span>
          <span className="font-semibold text-slate-800">
            {new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <span className="text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            Time Slot
          </span>
          <span className="font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-100">
            {timeSlot}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            Consultation Desk
          </span>
          <span className="font-medium text-slate-700">OPD Block A, Room 204</span>
        </div>
      </div>

      {/* Consultation Fee & Payment Card */}
      {appointment?.invoice && (
        <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-2xl p-5 border border-teal-200/80 mb-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-teal-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Consultation Invoice
              </span>
              <p className="text-sm font-bold text-slate-800">
                Invoice #{appointment.invoice.invoice_number || appointment.invoice.id}
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Amount Due</span>
              <span className="text-xl font-extrabold text-slate-900">
                ₹{consultationAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Payment Status:</span>
              {paidStatus ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PAID IN FULL
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  PAYMENT PENDING
                </span>
              )}
            </div>

            {!paidStatus ? (
              <button
                type="button"
                onClick={() => setIsPayModalOpen(true)}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all inline-flex items-center gap-1.5"
              >
                <span>Pay Consultation Fee (₹{consultationAmount.toFixed(2)})</span>
              </button>
            ) : (
              <Link
                to="/patient/billing"
                className="text-xs text-teal-700 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View Receipt in Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Patient Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 mb-6 text-left">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Please arrive <strong>15 minutes prior</strong> to your scheduled slot. Present this Appointment ID or confirmation slip at the Reception / OPD kiosk for direct check-in.
        </p>
      </div>

      {pdfError && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 mb-4">
          {pdfError}
        </div>
      )}

      {/* Download and Calendar Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingPdf ? 'Generating PDF...' : 'Download Slip (PDF)'}</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCalendar}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
        >
          <CalendarPlus className="w-4 h-4 text-brand-600" />
          <span>Add to Calendar (.ics)</span>
        </button>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
        <Link
          to="/patient/portal"
          className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Patient Portal Home</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (onSwitchDoctor) {
              onSwitchDoctor(appointment);
            } else {
              navigate('/patient/book', { state: { switchAppointment: appointment } });
            }
          }}
          className="py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-semibold text-sm hover:bg-amber-100 transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <RotateCw className="w-4 h-4 text-amber-700" />
          <span>Switch Doctor</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
        >
          Book Another
        </button>
      </div>

      {/* Live Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Pay Consultation Fee</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 text-center space-y-1">
              <span className="text-teal-700 uppercase tracking-wider text-[10px] font-bold">Consultation Fee</span>
              <p className="text-3xl font-black text-slate-900">
                ₹{consultationAmount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">Dr. {doctorName} • {departmentName}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`p-3 rounded-xl border text-center font-semibold text-xs transition-all ${
                    paymentMode === 'upi'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Instant UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('card')}
                  className={`p-3 rounded-xl border text-center font-semibold text-xs transition-all ${
                    paymentMode === 'card'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Card Payment
                </button>
              </div>
            </div>

            {paymentMode === 'upi' ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2.5">
                <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block mx-auto">
                  {qrLoading ? (
                    <div className="w-36 h-36 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RotateCw className="w-6 h-6 animate-spin text-brand-600" />
                      <span className="text-[10px] font-medium">Generating QR...</span>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Consultation Dynamic UPI QR" 
                      className="w-36 h-36 object-contain rounded-xl mx-auto"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-[10px] text-rose-500 font-medium">
                      Unable to generate QR
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800">
                    Scan using Google Pay, PhonePe, or Paytm
                  </p>
                  <p className="text-[11px] text-slate-500">
                    UPI ID: <span className="font-mono font-bold text-slate-700">{import.meta.env.VITE_HOSPITAL_UPI_ID || 'gangaganga2235@oksbi'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Card Number (XXXX XXXX XXXX XXXX)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    maxLength={3}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Pay Later
              </button>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isPaying}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isPaying ? 'Processing...' : `Confirm & Pay ₹${consultationAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmationScreen;
