import React from 'react';
import { Clock, Sun, Sunrise, Sunset, Check, Calendar as CalendarIcon, AlertTriangle, UserCheck, XCircle } from 'lucide-react';

const isSlotInPastClient = (dateStr, slotStr) => {
  if (!dateStr || !slotStr) return false;
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  const startTime = slotStr.split('-')[0].trim();
  const parts = startTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
  const [hours, minutes] = parts;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours > hours) return true;
  if (currentHours === hours && currentMinutes >= minutes) return true;

  return false;
};

const SlotPicker = ({ 
  selectedDate, 
  onDateChange, 
  slots = [], 
  selectedSlot, 
  onSelect, 
  bookedSlots = [],
  mySlots = [],
  myAppointments = [],
  unavailableSlots = [],
  pastSlots = [],
  isDayUnavailable = false,
  unavailabilityReason = '',
  doctorUnavailabilities = [],
  unavailableDates = [],
  onCancelAppointment = null,
}) => {
  // Generate next 7 days for the date scroller starting from today
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { dateStr, dayName, monthDay, fullDate: d };
  });

  // Check if a specific date in the 7-day scroller is fully marked unavailable
  const isDateUnavailable = (dateStr, dateObj) => {
    if (unavailableDates?.includes(dateStr)) return true;
    if (doctorUnavailabilities && doctorUnavailabilities.length > 0) {
      const dayOfWeek = dateObj.getDay();
      return doctorUnavailabilities.some((u) => {
        if (!u.time_slot) {
          if (u.date === dateStr) return true;
          if (u.is_recurring && u.recurring_day_of_week === dayOfWeek) return true;
        }
        return false;
      });
    }
    return false;
  };

  // Default grouping if not provided by API
  const morningSlots = slots.filter(s => s.startsWith('09') || s.startsWith('10') || s.startsWith('11'));
  const afternoonSlots = slots.filter(s => s.startsWith('14') || s.startsWith('15'));
  const eveningSlots = slots.filter(s => s.startsWith('16') || s.startsWith('17'));

  const renderSlotChip = (slot) => {
    const isPast = pastSlots.includes(slot) || isSlotInPastClient(selectedDate, slot);
    const isMyAppointment = mySlots.includes(slot);
    const isBooked = bookedSlots.includes(slot);
    const isDoctorUnavailable = isDayUnavailable || unavailableSlots.includes(slot);
    const isSelected = selectedSlot === slot;

    // Disabled for booking if past, booked by someone else, or doctor is off
    // If it's your appointment, it's not disabled; clicking it reveals details and cancel/reschedule option
    const isDisabled = isPast || (isBooked && !isMyAppointment) || isDoctorUnavailable;

    let chipClasses = 'py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between relative ';
    let title = 'Available for booking';
    let badgeContent = null;

    if (isPast) {
      chipClasses += 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-70';
      title = 'This time slot has already passed';
      badgeContent = <span className="text-[10px] text-slate-400 font-medium no-underline">Past</span>;
    } else if (isMyAppointment) {
      chipClasses += isSelected
        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30'
        : 'bg-indigo-50/90 border-indigo-300 text-indigo-900 hover:border-indigo-400 shadow-xs ring-1 ring-indigo-300/50';
      title = 'You have already booked this slot';
      badgeContent = (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded no-underline flex items-center gap-1 ${
          isSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
        }`}>
          <UserCheck className="w-2.5 h-2.5" /> Your Appt
        </span>
      );
    } else if (isDoctorUnavailable) {
      chipClasses += 'bg-rose-50/60 border-rose-200 text-rose-400 cursor-not-allowed line-through';
      title = 'Doctor marked this slot as unavailable';
      badgeContent = <span className="text-[10px] text-rose-500 font-semibold no-underline">Unavailable</span>;
    } else if (isBooked) {
      chipClasses += 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed line-through';
      title = 'Slot already booked by another patient';
      badgeContent = <span className="text-[10px] text-slate-400 font-normal no-underline">Booked</span>;
    } else if (isSelected) {
      chipClasses += 'bg-brand-600 border-brand-600 text-white shadow-md ring-2 ring-brand-500/20';
      badgeContent = <Check className="w-3.5 h-3.5 text-white" />;
    } else {
      chipClasses += 'bg-white border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50/40 shadow-xs cursor-pointer';
      badgeContent = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>;
    }

    return (
      <button
        key={slot}
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect(slot)}
        className={chipClasses}
        title={title}
      >
        <span>{slot}</span>
        {badgeContent}
      </button>
    );
  };

  const selectedMyAppt = myAppointments.find(a => a.time_slot === selectedSlot);

  return (
    <div className="space-y-6">
      {/* 7-Day Horizontal Date Scroller */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Choose Consultation Date
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {next7Days.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            const isUnavailableDay = isDateUnavailable(day.dateStr, day.fullDate);

            return (
              <button
                key={day.dateStr}
                type="button"
                disabled={isUnavailableDay}
                onClick={() => !isUnavailableDay && onDateChange(day.dateStr)}
                className={`p-3 rounded-2xl border text-center transition-all relative ${
                  isUnavailableDay
                    ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    : isSelected
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md ring-2 ring-brand-500/20 transform -translate-y-0.5'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-slate-50 cursor-pointer'
                }`}
                title={isUnavailableDay ? 'Doctor is unavailable on this date' : undefined}
              >
                <p className={`text-[11px] font-medium ${
                  isUnavailableDay ? 'text-slate-400' : isSelected ? 'text-brand-100' : 'text-slate-400'
                }`}>
                  {day.dayName}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${isUnavailableDay ? 'line-through text-slate-400' : ''}`}>
                  {day.monthDay}
                </p>
                {isUnavailableDay && (
                  <span className="inline-block mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                    Unavailable
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Morning / Afternoon / Evening Slot Groups */}
      <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-bold text-slate-800">
              2. Available Time Slots ({selectedDate})
            </span>
          </div>

          {/* 4 Distinct Slot States Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> Booked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Your Appointment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 line-through"></span> Past
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Unavailable
            </span>
          </div>
        </div>

        {/* Doctor Full Day Unavailable Warning */}
        {isDayUnavailable && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Doctor is unavailable on this date</p>
              <p className="text-amber-700 mt-0.5">
                {unavailabilityReason || 'The doctor has marked this entire day as off/leave.'} Please select another available date from the calendar above.
              </p>
            </div>
          </div>
        )}

        {/* Morning Slots */}
        {morningSlots.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Sunrise className="w-3.5 h-3.5 text-amber-500" />
              <span>Morning Sessions (09:00 AM - 12:00 PM)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {morningSlots.map(renderSlotChip)}
            </div>
          </div>
        )}

        {/* Afternoon Slots */}
        {afternoonSlots.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Sun className="w-3.5 h-3.5 text-orange-500" />
              <span>Afternoon Sessions (02:00 PM - 04:30 PM)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {afternoonSlots.map(renderSlotChip)}
            </div>
          </div>
        )}

        {/* Evening Slots */}
        {eveningSlots.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Sunset className="w-3.5 h-3.5 text-purple-500" />
              <span>Evening Sessions (04:30 PM - 06:00 PM)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {eveningSlots.map(renderSlotChip)}
            </div>
          </div>
        )}

        {/* Selected Slot Information Bar */}
        {selectedSlot && (
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-4 ${
            mySlots.includes(selectedSlot)
              ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
              : 'bg-brand-50 border-brand-200 text-brand-900'
          }`}>
            <div>
              <span className="font-medium block sm:inline">
                {mySlots.includes(selectedSlot) ? 'Your Scheduled Slot:' : 'Selected Appointment Slot:'}
              </span>
              <span className="font-bold font-mono text-sm text-brand-700 bg-white px-3 py-1 rounded-lg border border-brand-300 ml-0 sm:ml-2 mt-1 sm:mt-0 inline-block">
                {selectedDate} • {selectedSlot}
              </span>
            </div>

            {mySlots.includes(selectedSlot) && onCancelAppointment && selectedMyAppt && (
              <button
                type="button"
                onClick={() => onCancelAppointment(selectedMyAppt.id)}
                className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel This Appointment</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotPicker;
