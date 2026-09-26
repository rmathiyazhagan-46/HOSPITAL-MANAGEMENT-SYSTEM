import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import DashboardShell from '../../components/layout/DashboardShell';
import { Stethoscope, Pill, Plus, Trash2, ArrowLeft, CheckCircle2, FileText, AlertTriangle, PackageCheck, Check, Lock } from 'lucide-react';
import { submitConsultationAndPrescription } from '../../services/doctorAuthService';
import { confirmAppointment } from '../../services/appointmentService';
import api from '../../services/api';
import {
  DOSAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
} from '../../utils/prescriptionOptions';

const Prescribe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const appointment = location.state?.appointment;

  const [currentAppt, setCurrentAppt] = useState(appointment);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [diagnosisNotes, setDiagnosisNotes] = useState(
    appointment?.consultation_notes || appointment?.consultation?.diagnosis_notes || ''
  );
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [items, setItems] = useState([
    {
      medicine_id: '',
      quantity: 1,
      dosage: DOSAGE_OPTIONS[1] || '500mg',
      duration: DURATION_OPTIONS[2] || '5 days',
      dosage_schedule: [{ time: 'Morning', timing: 'After Food' }, { time: 'Night', timing: 'After Food' }],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isCompleted = currentAppt?.status === 'completed';
  const isPending = currentAppt?.status === 'pending';

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const res = await api.get('/pharmacy/medicines');
        const list = res?.data?.data || [];
        setMedicines(list);
        if (list.length > 0 && !items[0].medicine_id) {
          setItems([{ ...items[0], medicine_id: list[0].id, quantity: 1 }]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadMedicines();
  }, []);

  const getMedDetails = (medId) => {
    return medicines.find((m) => String(m.id) === String(medId)) || null;
  };

  const handleAddItem = () => {
    // Find first available medicine if possible
    const firstInStock = medicines.find((m) => (m.available_stock || 0) > 0) || medicines[0];
    setItems([
      ...items,
      {
        medicine_id: firstInStock?.id || '',
        quantity: 1,
        dosage: DOSAGE_OPTIONS[4] || '1 tablet',
        duration: DURATION_OPTIONS[3] || '7 days',
        dosage_schedule: [{ time: 'Morning', timing: 'After Food' }],
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = val;
    setItems(updated);
  };

  const handleScheduleChange = (itemIdx, timeStr, checked, timingStr) => {
    const updated = [...items];
    let schedule = updated[itemIdx].dosage_schedule || [];
    
    if (checked) {
      // Add or update
      const existing = schedule.find(s => s.time === timeStr);
      if (existing) {
        existing.timing = timingStr;
      } else {
        schedule.push({ time: timeStr, timing: timingStr });
      }
    } else {
      // Remove
      schedule = schedule.filter(s => s.time !== timeStr);
    }
    
    // Sort array so it matches logical order
    const order = { 'Morning': 1, 'Afternoon': 2, 'Evening': 3, 'Night': 4 };
    schedule.sort((a, b) => order[a.time] - order[b.time]);

    updated[itemIdx].dosage_schedule = schedule;
    setItems(updated);
  };

  const AVAILABLE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

  // Stock issue validation
  const stockErrors = items.map((it) => {
    const med = getMedDetails(it.medicine_id);
    if (!med) return 'Medicine not selected';
    const avail = Number(med.available_stock) || 0;
    const qty = Number(it.quantity) || 0;
    if (avail <= 0) return `"${med.name}" is completely out of stock.`;
    if (qty > avail) return `Only ${avail} unit(s) of "${med.name}" in stock (requested ${qty}).`;
    return null;
  });

  const hasStockIssues = stockErrors.some((err) => err !== null);

  const estimatedTotal = items.reduce((acc, it) => {
    const med = getMedDetails(it.medicine_id);
    const qty = Number(it.quantity) || 0;
    const price = Number(med?.unit_price) || 0;
    return acc + qty * price;
  }, 0);

  const handleConfirmSlot = async () => {
    if (!currentAppt?.id) return;
    try {
      setConfirmLoading(true);
      const res = await confirmAppointment(currentAppt.id);
      setCurrentAppt(prev => ({ ...prev, status: 'confirmed', confirmed_at: new Date() }));
      alert(res?.message || 'Appointment slot confirmed successfully. You can now consult & prescribe.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm appointment slot.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isCompleted) {
      alert('This consultation has already been completed. Further edits are disabled.');
      return;
    }

    if (isPending) {
      alert('This appointment slot is pending confirmation. Please confirm the appointment first.');
      return;
    }

    if (!diagnosisNotes.trim()) {
      alert('Please enter clinical diagnosis notes.');
      return;
    }

    if (hasStockIssues) {
      alert('Cannot issue prescription: One or more medicines have insufficient or depleted warehouse stock. Please adjust quantities before proceeding.');
      return;
    }

    setLoading(true);
    try {
      const combinedNotes = prescriptionNotes.trim() ? `DIET & LIFESTYLE ADVICE:\n${prescriptionNotes.trim()}` : '';

      // 1. Submit consultation & prescription
      await submitConsultationAndPrescription({
        appointment_id: currentAppt?.id,
        patient_id: currentAppt?.patient_id,
        diagnosis_notes: diagnosisNotes,
        prescription_notes: combinedNotes,
        items: items.map((it) => {
          // Generate a fallback frequency string based on schedule for legacy compatibility
          const freqStr = it.dosage_schedule && it.dosage_schedule.length > 0
            ? it.dosage_schedule.map(s => `${s.time} (${s.timing})`).join(', ')
            : 'As directed';

          return {
            medicine_id: it.medicine_id,
            quantity: Math.max(1, parseInt(it.quantity) || 1),
            dosage: it.dosage,
            frequency: freqStr,
            dosage_schedule: it.dosage_schedule,
            duration: it.duration,
          };
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        // Move row automatically to Completed tab and disable further edits
        navigate('/doctor/dashboard', { state: { tab: 'completed' } });
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit consultation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell role="doctor" title="Clinical Consultation & Prescription">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/doctor/dashboard"
          state={{ tab: isCompleted ? 'completed' : 'all' }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Consultation Queue</span>
        </Link>

        {/* Status Stage Warning Banner */}
        {isCompleted && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Consultation Finalized &amp; Prescriptions Issued (Read-Only)</p>
                <p className="text-[11px] text-emerald-700">Completed on {currentAppt.completed_at ? new Date(currentAppt.completed_at).toLocaleString() : currentAppt.appointment_date}. Further edits are disabled to maintain medical audit integrity.</p>
              </div>
            </div>
            <Link
              to="/doctor/dashboard"
              state={{ tab: 'completed' }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shrink-0"
            >
              View in Completed Queue
            </Link>
          </div>
        )}

        {isPending && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Appointment Pending Doctor Confirmation</p>
                <p className="text-[11px] text-amber-700">Stage 1 of 3: You must accept/confirm the patient's slot before submitting clinical notes or pharmacy orders.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmSlot}
              disabled={confirmLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {confirmLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Confirm Slot Now</span>
            </button>
          </div>
        )}

        {/* Patient header card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                Patient Consultation
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {currentAppt?.status || 'CONFIRMED'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {currentAppt?.patient?.name || 'Walk-in Patient'}
            </h3>
            <p className="text-xs text-slate-500">
              Patient ID: <span className="font-mono font-semibold">{currentAppt?.patient?.patient_id}</span> •
              Appointment #{currentAppt?.id}
            </p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <p>Scheduled: {currentAppt?.appointment_date}</p>
            <p className="font-semibold text-brand-600">{currentAppt?.time_slot}</p>
          </div>
        </div>

        {success ? (
          <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-lg">Consultation Completed!</h4>
            <p className="text-xs text-emerald-700">
              Prescription recorded, invoice generated, and appointment marked complete.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Diagnosis Notes */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Stethoscope className="w-4 h-4 text-brand-600" />
                <span>Diagnosis & Clinical Assessment</span>
              </div>

              <textarea
                rows={3}
                required
                disabled={isCompleted}
                value={diagnosisNotes}
                onChange={(e) => setDiagnosisNotes(e.target.value)}
                placeholder="Enter patient diagnosis, findings, clinical observations, and vital signs..."
                className={`w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 leading-relaxed ${
                  isCompleted ? 'cursor-not-allowed bg-slate-100 text-slate-600' : ''
                }`}
              />
            </div>

            {/* Prescribe Medicines */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Pill className="w-4 h-4 text-brand-600" />
                  <span>Prescription Medicine Schedule</span>
                </div>

                {!isCompleted && !isPending && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="py-1.5 px-3 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => {
                  const med = getMedDetails(item.medicine_id);
                  const availStock = Number(med?.available_stock) || 0;
                  const unitPrice = Number(med?.unit_price) || 0;
                  const qty = Number(item.quantity) || 1;
                  const lineTotal = qty * unitPrice;
                  const isDepleted = med && availStock <= 0;
                  const isOverLimit = med && availStock > 0 && qty > availStock;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isDepleted || isOverLimit
                          ? 'border-rose-300 bg-rose-50/50 shadow-xs ring-1 ring-rose-300'
                          : 'border-slate-200 bg-slate-50/60'
                      } space-y-3 text-xs`}
                    >
                      {/* Top Row: Medicine Selector & Live Stock Badge & Quantity & Line Total */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        {/* Medicine Selector */}
                        <div className="md:col-span-5">
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700 flex items-center gap-1">
                              <span>Medicine</span>
                              <span className="text-rose-500">*</span>
                            </label>
                            {med && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  availStock > 10
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : availStock > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {availStock > 0 ? `In Stock: ${availStock} units` : 'Out of Stock (0)'}
                              </span>
                            )}
                          </div>

                          <select
                            value={item.medicine_id}
                            onChange={(e) => handleItemChange(idx, 'medicine_id', e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                          >
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.category}) — {m.available_stock > 0 ? `${m.available_stock} in stock` : 'Out of Stock'} — ₹{Number(m.unit_price || 0).toFixed(2)}
                              </option>
                            ))}
                          </select>

                          {isDepleted && (
                            <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              This medicine is currently out of stock.
                            </p>
                          )}
                          {isOverLimit && (
                            <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Requested {qty} exceeds available stock ({availStock} max).
                            </p>
                          )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="md:col-span-2">
                          <label className="font-semibold text-slate-700 block mb-1">
                            Quantity (Units)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={availStock > 0 ? availStock : undefined}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'quantity',
                                Math.max(1, parseInt(e.target.value, 10) || 1)
                              )
                            }
                            className={`w-full p-2.5 bg-white border rounded-lg text-xs font-semibold focus:outline-none ${
                              isOverLimit
                                ? 'border-rose-400 text-rose-700 bg-rose-50'
                                : 'border-slate-300 text-slate-800 focus:border-brand-500'
                            }`}
                          />
                        </div>

                        {/* Unit Price & Line Total */}
                        <div className="md:col-span-4 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                              Unit Price
                            </span>
                            <span className="font-semibold text-slate-700">₹{unitPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                              Line Total
                            </span>
                            <span className="font-bold text-brand-700 text-sm">
                              ₹{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Remove Action */}
                        <div className="md:col-span-1 flex justify-center pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-25 transition-colors"
                            title="Remove Medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Dosage, Frequency, Duration */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/60">
                        <div>
                          <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Dosage</label>
                          <select
                            value={item.dosage}
                            onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                          >
                            {DOSAGE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Duration</label>
                          <select
                            value={item.duration}
                            onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                          >
                            {DURATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dosage Schedule (Flexible 1-4 times/day) */}
                      <div className="pt-3 border-t border-slate-200/60">
                        <label className="font-semibold text-slate-700 block mb-2 text-xs">Flexible Dosage Schedule</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {AVAILABLE_TIMES.map((timeLabel) => {
                            const scheduleItem = (item.dosage_schedule || []).find(s => s.time === timeLabel);
                            const isSelected = !!scheduleItem;
                            return (
                              <div 
                                key={timeLabel}
                                className={`p-2 rounded-lg border transition-all ${
                                  isSelected ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                                }`}
                              >
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={(e) => handleScheduleChange(idx, timeLabel, e.target.checked, 'After Food')}
                                    className="w-3.5 h-3.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                                  />
                                  <span className={`text-[11px] font-bold ${isSelected ? 'text-brand-900' : 'text-slate-600'}`}>
                                    {timeLabel}
                                  </span>
                                </label>
                                
                                {isSelected && (
                                  <select
                                    value={scheduleItem.timing || 'After Food'}
                                    onChange={(e) => handleScheduleChange(idx, timeLabel, true, e.target.value)}
                                    className="w-full p-1 bg-white border border-brand-200 rounded text-[10px] text-brand-800 focus:outline-none focus:border-brand-500"
                                  >
                                    <option value="After Food">After Food</option>
                                    <option value="Before Food">Before Food</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stock Warning Box if any item is invalid */}
              {hasStockIssues && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Insufficient or Depleted Stock Detected</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 pl-1 space-y-0.5">
                    {stockErrors
                      .filter(Boolean)
                      .map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                  </ul>
                  <p className="text-[11px] text-rose-600 italic pt-0.5">
                    Please adjust quantities or remove unavailable medicines before finalizing the prescription.
                  </p>
                </div>
              )}

              {/* Real-time Pharmacy Bill Summary */}
              <div className="p-4 bg-gradient-to-r from-brand-50/60 to-emerald-50/60 rounded-xl border border-brand-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">Automatic Pharmacy Billing & Stock Deduction</span>
                    <span className="text-[11px] text-slate-500">
                      Stock will be deducted immediately (FEFO) and a pending pharmacy invoice will be created for the patient.
                    </span>
                  </div>
                </div>
                <div className="text-right sm:pl-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Estimated Bill Total</span>
                  <span className="text-base font-black text-emerald-700">₹{estimatedTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1 text-xs">
                  Dietary / Lifestyle Advice & Special Instructions
                </label>
                <input
                  type="text"
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="e.g. Drink plenty of water, avoid spicy food, take after meals."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <div className="text-xs text-slate-500">
                {hasStockIssues ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Cannot issue: Resolve warehouse stock errors above
                  </span>
                ) : (
                  <span>Ready to submit prescription and generate pharmacy billing.</span>
                )}
              </div>

              {isCompleted ? (
                <div className="py-2.5 px-5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 inline-flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Consultation Finalized &amp; Locked</span>
                </div>
              ) : isPending ? (
                <button
                  type="button"
                  onClick={handleConfirmSlot}
                  disabled={confirmLoading}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{confirmLoading ? 'Confirming...' : 'Confirm Slot to Enable Prescribing'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || hasStockIssues}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Finalizing Consultation...' : 'Finalize & Issue Prescription'}</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
};

export default Prescribe;
