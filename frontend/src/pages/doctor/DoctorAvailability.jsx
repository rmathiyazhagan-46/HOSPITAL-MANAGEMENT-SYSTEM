import React, { useState, useEffect } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  Repeat,
  Sun,
  Sunrise,
  Sunset,
  Stethoscope,
  Info,
} from 'lucide-react';
import {
  getDoctorAvailability,
  addDoctorAvailability,
  deleteDoctorAvailability,
} from '../../services/doctorAvailabilityService';
import { useAuth } from '../../context/AuthContext';

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

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorAvailability = () => {
  const { doctorAuth } = useAuth();
  const doctorId = doctorAuth.user?.id;

  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [scope, setScope] = useState(''); // '' | 'full_day' | 'specific_slot'
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load doctor availabilities
  const loadAvailabilities = async () => {
    if (!doctorId) return;
    try {
      setLoading(true);
      const res = await getDoctorAvailability(doctorId);
      setAvailabilities(res?.data || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setActionError('Failed to load availability schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailabilities();
  }, [doctorId]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Add unavailability entry
  const handleAddUnavailability = async (e) => {
    e.preventDefault();
    if (!doctorId || !selectedDate) return;

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
        const res = await addDoctorAvailability(doctorId, payload);
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
          const res = await addDoctorAvailability(doctorId, payload);
          if (!res?.success) throw new Error(res?.message || 'Failed to update availability.');
        }
      }

      setActionSuccess('Leave applied and active.');
      loadAvailabilities();
      window.dispatchEvent(new CustomEvent('doctor-availability-changed'));
      localStorage.setItem('doctor_availability_updated', Date.now().toString());
      // Reset form to initial empty state
      setScope('');
      setSelectedSlots([]);
      setReason('');
      setCustomReason('');
      setIsRecurring(false);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save unavailability.';
      setActionError(msg);
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete unavailability entry
  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to remove this unavailability entry and reopen this date/slot for bookings?')) {
      return;
    }

    try {
      const res = await deleteDoctorAvailability(doctorId, entryId);
      if (res?.success) {
        setActionSuccess('Unavailability entry removed. Slot is now available for patient appointments.');
        loadAvailabilities();
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

  // Calendar Calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

  // Map entries for calendar display
  const getEntriesForDate = (dateStr, dateObj) => {
    const dayOfWeek = dateObj.getDay();
    return availabilities.filter(item => {
      if (item.date === dateStr) return true;
      if (item.is_recurring && item.recurring_day_of_week === dayOfWeek) return true;
      return false;
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Quick statistics
  const fullDayLeaves = availabilities.filter(a => !a.time_slot);
  const slotBlocks = availabilities.filter(a => !!a.time_slot);
  const recurringOffs = availabilities.filter(a => a.is_recurring);

  const selectedDateDayOfWeek = new Date(`${selectedDate}T00:00:00`).getDay();
  const selectedDayEntries = getEntriesForDate(selectedDate, new Date(`${selectedDate}T00:00:00`));

  return (
    <DashboardShell role="doctor" title="Doctor Availability & Schedule Management">
      <div className="space-y-6">
        {/* Physician Header Banner */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20 shadow-inner">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold mb-1 border border-teal-400/30">
                <span>Duty Roster & Time Slot Exclusions</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {doctorAuth.user?.name || 'Physician'} Availability Calendar
              </h2>
              <p className="text-xs text-teal-100 flex flex-wrap items-center gap-2 mt-0.5">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded font-bold">
                  {doctorAuth.user?.employee_id || 'DOC-2026'}
                </span>
                <span>•</span>
                <span>{doctorAuth.user?.specialization || 'Specialist'}</span>
                <span>•</span>
                <span>Slots marked unavailable are automatically locked from patient bookings.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/15">
            <div className="text-right px-3">
              <span className="text-[10px] uppercase font-bold text-teal-200 block tracking-wider">Status</span>
              <span className="text-xs font-black text-emerald-300 capitalize">
                {doctorAuth.user?.availability_status || 'available'}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications & Banners */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-emerald-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
            <button onClick={() => setActionError('')} className="text-rose-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Full-Day Leaves"
            value={fullDayLeaves.length}
            subtitle="Full day holidays or leaves scheduled"
            icon={CalendarX}
            color="rose"
          />
          <StatCard
            title="Specific Slot Exclusions"
            value={slotBlocks.length}
            subtitle="Individual unavailable slots"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Recurring Weekly Off-Days"
            value={recurringOffs.length}
            subtitle="Weekly repeating pattern (e.g. Sunday)"
            icon={Repeat}
            color="brand"
          />
        </div>

        {/* Main Grid: Calendar + Action Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Monthly Calendar View (7 cols on desktop) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  {monthName} {currentYear}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} className={`text-[11px] font-bold py-1.5 ${i === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-2xl bg-slate-50/50 border border-dashed border-slate-100"></div>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dateObj = new Date(currentYear, currentMonth, dayNum);
                const dayEntries = getEntriesForDate(dStr, dateObj);
                const isSelected = selectedDate === dStr;
                const isToday = todayStr === dStr;
                const hasFullDayOff = dayEntries.some(e => !e.time_slot);
                const slotCount = dayEntries.filter(e => !!e.time_slot).length;

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setSelectedDate(dStr)}
                    className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs'
                        : isToday
                        ? 'border-teal-400 bg-teal-50/30'
                        : hasFullDayOff
                        ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isSelected
                          ? 'text-brand-700'
                          : isToday
                          ? 'text-teal-700'
                          : dateObj.getDay() === 0
                          ? 'text-rose-500'
                          : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" title="Today"></span>
                      )}
                    </div>

                    {/* Badge Indicators for unavailability */}
                    <div className="space-y-0.5">
                      {hasFullDayOff && (
                        <span className="block text-[9px] font-bold text-rose-700 bg-rose-100/90 border border-rose-200 rounded px-1 py-0.2 truncate">
                          Full Leave
                        </span>
                      )}
                      {slotCount > 0 && !hasFullDayOff && (
                        <span className="block text-[9px] font-bold text-amber-700 bg-amber-100/90 border border-amber-200 rounded px-1 py-0.2 truncate">
                          {slotCount} Slot{slotCount > 1 ? 's' : ''} Off
                        </span>
                      )}
                      {dayEntries.some(e => e.is_recurring) && (
                        <span className="block text-[8px] font-semibold text-sky-600 bg-sky-50 rounded px-0.5 truncate">
                          ↻ Weekly
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300"></span> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300"></span> Full Day Leave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300"></span> Specific Slots Off
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-brand-50 border border-brand-400"></span> Selected Date
              </span>
            </div>
          </div>

          {/* Right: Quick Action Form (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-slate-800 text-base">Mark as Unavailable</h3>
                </div>
                <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  {selectedDate}
                </span>
              </div>

              <form onSubmit={handleAddUnavailability} className="space-y-4">
                {/* Date Picker Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono shadow-2xs"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Day: {DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]}
                  </p>
                </div>

                {/* Scope Selection (Full Day vs Specific Slot) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Unavailability Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setScope('full_day'); setSelectedSlots([]); }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        scope === 'full_day'
                          ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Entire Day Off / Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => { setScope('specific_slot'); setSelectedSlots([]); }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        scope === 'specific_slot'
                          ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Specific Time Slot
                    </button>
                  </div>
                </div>

                {/* Time Slot Picker (if Specific Slot selected) */}
                {scope === 'specific_slot' && (
                  <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <label className="block text-xs font-bold text-slate-700">
                      Select Time Slot to Block:
                    </label>

                    {/* Morning */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Morning
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {morningSlots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSlots(prev => prev.includes(s) ? prev.filter(slot => slot !== s) : [...prev, s])}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              selectedSlots.includes(s)
                                ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Afternoon */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Afternoon
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {afternoonSlots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSlots(prev => prev.includes(s) ? prev.filter(slot => slot !== s) : [...prev, s])}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              selectedSlots.includes(s)
                                ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Evening */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Evening
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {eveningSlots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSlots(prev => prev.includes(s) ? prev.filter(slot => slot !== s) : [...prev, s])}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                              selectedSlots.includes(s)
                                ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason / Note (Optional)
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white shadow-2xs mb-2"
                  >
                    <option value="">Select reason (optional)</option>
                    <option value="Personal Leave">Personal Leave</option>
                    <option value="Medical Conference / Symposium">Medical Conference / Symposium</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Hospital Ward Rounds">Hospital Ward Rounds</option>
                    <option value="Emergency Surgery Duty">Emergency Surgery Duty</option>
                    <option value="Day Off / Holiday">Day Off / Holiday</option>
                    <option value="Other">Other (Custom Reason)</option>
                  </select>

                  {reason === 'Other' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Enter custom reason..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  )}
                </div>

                {/* Recurring Weekly Pattern */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="recurringCheckbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="recurringCheckbox" className="text-xs text-slate-700 cursor-pointer">
                    <strong className="block font-bold text-slate-900">
                      Repeat weekly on every {DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]}
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Mark {scope === 'full_day' ? 'all upcoming ' + DAYS_OF_WEEK_FULL[selectedDateDayOfWeek] + 's' : `this slot on every upcoming ${DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]}`} as unavailable automatically.
                    </span>
                  </label>
                </div>

                {!(scope === 'full_day' || (scope === 'specific_slot' && selectedSlots.length > 0)) && (
                  <p className="text-[11px] text-amber-600 mb-2 font-medium">
                    Select a scope (and a time slot, if Specific Time Slot) to continue.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !(scope === 'full_day' || (scope === 'specific_slot' && selectedSlots.length > 0))}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Save Unavailability'}</span>
                </button>
              </form>
            </div>

            {/* Selected Date Summary Box */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  Status for {selectedDate} ({DAYS_OF_WEEK_FULL[selectedDateDayOfWeek]})
                </h4>
              </div>

              {selectedDayEntries.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No exclusions recorded for this date. All standard consultation slots are currently open for booking.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {item.time_slot ? `Slot: ${item.time_slot}` : 'Full Day Leave'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.reason} {item.is_recurring && '• (Recurring Weekly)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove exclusion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Full List / Summary of Upcoming Marked-Unavailable Dates */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                All Scheduled Unavailable Dates & Blocked Slots
              </h3>
              <p className="text-xs text-slate-400">
                Review, manage, or remove upcoming leave days and slot blocks
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {availabilities.length} Total Exclusion{availabilities.length === 1 ? '' : 's'}
            </span>
          </div>

          {availabilities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No unavailability records found.</p>
              <p className="mt-1">All appointments are open according to your default weekly schedule.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Scope / Slot</th>
                    <th className="py-3 px-4 font-bold">Recurring Pattern</th>
                    <th className="py-3 px-4 font-bold">Reason</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availabilities.map((item) => {
                    const isFullDay = !item.time_slot;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {item.date}
                        </td>
                        <td className="py-3 px-4">
                          {isFullDay ? (
                            <Badge variant="danger">Full Day Off</Badge>
                          ) : (
                            <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {item.time_slot}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.is_recurring ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                              <Repeat className="w-3 h-3" /> Every {DAYS_OF_WEEK_FULL[item.recurring_day_of_week]}
                            </span>
                          ) : (
                            <span className="text-slate-400">One-time</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {item.reason || 'Leave'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                            title="Undo / Remove Unavailability"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default DoctorAvailability;
