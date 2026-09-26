import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Badge from '../shared/Badge';
import {
  Calendar as CalendarIcon,
  Clock,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  Repeat,
  Stethoscope,
} from 'lucide-react';
import {
  getDoctorAvailability,
  addDoctorAvailability,
  deleteDoctorAvailability,
} from '../../services/doctorAvailabilityService';

const ALL_SLOTS = [
  '09:00 - 09:30',
  '09:30 - 10:00',
  '10:00 - 10:30',
  '10:30 - 11:00',
  '11:00 - 11:30',
  '11:30 - 12:00',
  '14:00 - 14:30',
  '14:30 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00',
  '16:00 - 16:30',
  '16:30 - 17:00',
];

const morningSlots = ALL_SLOTS.filter(s => s.startsWith('09') || s.startsWith('10') || s.startsWith('11'));
const afternoonSlots = ALL_SLOTS.filter(s => s.startsWith('14') || s.startsWith('15'));
const eveningSlots = ALL_SLOTS.filter(s => s.startsWith('16') || s.startsWith('17'));

const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorAvailabilityModal = ({ doctor, isOpen, onClose }) => {
  if (!doctor) return null;

  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Form State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [scope, setScope] = useState(''); // '' | 'full_day' | 'specific_slot'
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getDoctorAvailability(doctor.id);
      setAvailabilities(res?.data || []);
    } catch (err) {
      console.error(err);
      setActionError('Failed to load doctor schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && doctor?.id) {
      loadData();
      setActionSuccess('');
      setActionError('');
    }
  }, [isOpen, doctor?.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;

    setSubmitting(true);
    setActionError('');
    setActionSuccess('');

    let finalReason = reason === 'Other' ? (customReason || 'Leave / Unavailable') : reason;
    if (!finalReason) {
      finalReason = 'Unavailable';
    }

    try {
      if (scope === 'full_day') {
        const payload = {
          date: selectedDate,
          time_slot: null,
          is_recurring: isRecurring,
          recurring_day_of_week: isRecurring ? new Date(`${selectedDate}T00:00:00`).getDay() : null,
          reason: finalReason,
        };
        const res = await addDoctorAvailability(doctor.id, payload);
        if (!res?.success) throw new Error(res?.message || 'Failed to update availability.');
      } else if (scope === 'specific_slot') {
        for (const slot of selectedSlots) {
          const payload = {
            date: selectedDate,
            time_slot: slot,
            is_recurring: isRecurring,
            recurring_day_of_week: isRecurring ? new Date(`${selectedDate}T00:00:00`).getDay() : null,
            reason: finalReason,
          };
          const res = await addDoctorAvailability(doctor.id, payload);
          if (!res?.success) throw new Error(res?.message || 'Failed to update availability.');
        }
      }

      setActionSuccess('Availability updated successfully.');
      loadData();
      window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
      localStorage.setItem('doctor_availability_updated', Date.now().toString());
      setScope('');
      setSelectedSlots([]);
      setReason('');
      setCustomReason('');
      setIsRecurring(false);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update doctor availability.';
      setActionError(msg);
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Remove this unavailability record and restore open bookings for this doctor?')) {
      return;
    }

    try {
      const res = await deleteDoctorAvailability(doctor.id, entryId);
      if (res?.success) {
        setActionSuccess('Record removed. Doctor schedule reopened.');
        loadData();
        window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
        localStorage.setItem('doctor_availability_updated', Date.now().toString());
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove entry.';
      setActionError(msg);
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const selectedDateDayOfWeek = new Date(`${selectedDate}T00:00:00`).getDay();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Doctor Availability Override: ${doctor.name}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Doctor Summary Header */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{doctor.name}</h4>
              <p className="text-xs text-slate-300">
                {doctor.specialization} • ID: <span className="font-mono">{doctor.employee_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Global Status:</span>
            <Badge variant={doctor.availability_status === 'available' ? 'success' : 'neutral'}>
              {doctor.availability_status}
            </Badge>
          </div>
        </div>

        {/* Notifications */}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Admin Add Unavailability Form */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <PlusCircle className="w-4 h-4 text-brand-600" />
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Add New Unavailability Override (Admin)
            </h5>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:border-brand-500 shadow-2xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Day: {DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scope
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setScope('full_day'); setSelectedSlots([]); }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      scope === 'full_day'
                        ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Full Day Off
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScope('specific_slot'); setSelectedSlots([]); }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      scope === 'specific_slot'
                        ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Specific Slot
                  </button>
                </div>
              </div>
            </div>

            {/* Time Slot Selection */}
            {scope === 'specific_slot' && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Time Slot:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {ALL_SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlots(prev => prev.includes(s) ? prev.filter(slot => slot !== s) : [...prev, s])}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                        selectedSlots.includes(s)
                          ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-brand-500 shadow-2xs"
                >
                  <option value="">Select reason (optional)</option>
                  <option value="Authorized Medical Leave">Authorized Medical Leave</option>
                  <option value="Hospital Ward Rounds">Hospital Ward Rounds</option>
                  <option value="Emergency Duty">Emergency Duty</option>
                  <option value="Symposium / Training">Symposium / Training</option>
                  <option value="Holiday / Day Off">Holiday / Day Off</option>
                  <option value="Other">Other</option>
                </select>

                {reason === 'Other' && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-500"
                  />
                )}
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Repeat every {DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]} (Weekly)
                  </span>
                </label>
              </div>
            </div>

            {!(scope === 'full_day' || (scope === 'specific_slot' && selectedSlots.length > 0)) && (
              <p className="text-[11px] text-amber-600 mb-2 font-medium">
                Select a scope (and a time slot, if Specific Slot) to continue.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !(scope === 'full_day' || (scope === 'specific_slot' && selectedSlots.length > 0))}
              className="py-2.5 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Applying...' : 'Apply Doctor Override'}</span>
            </button>
          </form>
        </div>

        {/* Existing Doctor Unavailabilities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Active Unavailability Records ({availabilities.length})
            </h5>
            <span className="text-[11px] text-slate-400">
              Excludes dates from patient booking wizard
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading schedule...</div>
          ) : availabilities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
              No unavailability overrides configured for {doctor.name}.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs">
              {availabilities.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{item.date}</span>
                      {!item.time_slot ? (
                        <Badge variant="danger">Full Day Off</Badge>
                      ) : (
                        <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {item.time_slot}
                        </span>
                      )}
                      {item.is_recurring && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                          <Repeat className="w-2.5 h-2.5" /> Weekly {DAYS_OF_WEEK_FULL[item.recurring_day_of_week]}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Reason: {item.reason || 'Leave'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                    title="Remove exclusion"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DoctorAvailabilityModal;
