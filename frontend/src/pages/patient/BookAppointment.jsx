import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardShell from '../../components/layout/DashboardShell';
import StepProgress from '../../components/shared/StepProgress';
import DepartmentSelect from '../../components/booking/DepartmentSelect';
import DoctorCard from '../../components/booking/DoctorCard';
import SlotPicker from '../../components/booking/SlotPicker';
import BookingForm from '../../components/booking/BookingForm';
import ConfirmationScreen from '../../components/booking/ConfirmationScreen';
import { ArrowLeft, ArrowRight, Check, Search, Filter, AlertTriangle, Calendar, Stethoscope, RotateCw, CheckCircle2, X } from 'lucide-react';
import { getDepartments, getAvailableSlots, bookAppointment, cancelAppointment } from '../../services/appointmentService';
import { getDoctorsList } from '../../services/adminAuthService';
import { getDoctorAvailability } from '../../services/doctorAvailabilityService';

const STEPS = [
  'Select Department',
  'Choose Doctor',
  'Pick Date & Slot',
  'Confirm Details',
  'Confirmed'
];

const BookAppointment = () => {
  const location = useLocation();
  const [switchTargetAppointment, setSwitchTargetAppointment] = useState(location.state?.switchAppointment || null);
  const [currentStep, setCurrentStep] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [mySlots, setMySlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [pastSlots, setPastSlots] = useState([]);
  const [isDayUnavailable, setIsDayUnavailable] = useState(false);
  const [unavailabilityReason, setUnavailabilityReason] = useState('');
  const [doctorUnavailabilities, setDoctorUnavailabilities] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [reason, setReason] = useState('');
  const [confirmedAppt, setConfirmedAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast banner
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Search & filter states for Doctor selection (Step 1)
  const [doctorSearch, setDoctorSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'today'

  // If switching an existing appointment, initialize with its department and advance to Step 1
  useEffect(() => {
    if (switchTargetAppointment) {
      const deptId =
        switchTargetAppointment.department_id ||
        switchTargetAppointment.department?.id ||
        switchTargetAppointment.doctor?.department_id;
      if (deptId) {
        setSelectedDeptId(deptId);
        setCurrentStep(1);
      }
      if (switchTargetAppointment.appointment_date) {
        setSelectedDate(switchTargetAppointment.appointment_date);
      }
    }
  }, [switchTargetAppointment]);

  // Load departments on mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await getDepartments();
        setDepartments(res?.data || []);
      } catch (err) {
        console.error('Error loading departments:', err);
      }
    };
    fetchDepts();
  }, []);

  // When department selected or changed, load matching doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const params = selectedDeptId ? { department_id: selectedDeptId } : {};
        const res = await getDoctorsList(params);
        setDoctors(res?.data || []);
      } catch (err) {
        console.error('Error loading doctors:', err);
      }
    };
    fetchDoctors();

    const handleSync = () => {
      fetchDoctors();
    };

    const handleStorage = (e) => {
      if (e.key === 'doctor_availability_updated') {
        fetchDoctors();
      }
    };

    window.addEventListener('doctor-availability-changed', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('doctor-availability-changed', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleSync);
    };
  }, [selectedDeptId]);

  // When doctor is selected, fetch their full availability schedule (leaves, recurring off-days)
  useEffect(() => {
    if (!selectedDoctor) {
      setDoctorUnavailabilities([]);
      return;
    }
    const fetchDocAvailability = async () => {
      try {
        const res = await getDoctorAvailability(selectedDoctor.id);
        setDoctorUnavailabilities(res?.data || []);
      } catch (err) {
        console.error('Error loading doctor availability:', err);
      }
    };
    fetchDocAvailability();
  }, [selectedDoctor]);

  // When doctor and date selected, fetch real-time available, booked, and unavailable slots
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const fetchSlots = async () => {
      try {
        setErrorMsg('');
        const res = await getAvailableSlots(selectedDoctor.id, selectedDate);
        const data = res?.data || {};
        setAvailableSlots(data.allSlots || []);
        setBookedSlots(data.bookedSlots || []);
        setMySlots(data.mySlots || []);
        setMyAppointments(data.myAppointments || []);
        setUnavailableSlots(data.unavailableSlots || []);
        setPastSlots(data.pastSlots || []);
        setIsDayUnavailable(!!data.isDayUnavailable);
        setUnavailabilityReason(data.unavailabilityReason || '');

        // If currently selected slot is booked by someone else, or doctor-unavailable, or past, deselect it
        if (
          selectedSlot &&
          (data.bookedSlots?.includes(selectedSlot) ||
            data.unavailableSlots?.includes(selectedSlot) ||
            data.pastSlots?.includes(selectedSlot) ||
            data.isDayUnavailable)
        ) {
          setSelectedSlot('');
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Cancel appointment directly from a slot marked "Your Appointment"
  const handleCancelFromSlot = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await cancelAppointment(apptId);
      setToast({
        type: 'success',
        message: res?.message || 'Appointment cancelled successfully. The time slot has been released.',
      });
      // Refresh slots immediately
      if (selectedDoctor && selectedDate) {
        const slotRes = await getAvailableSlots(selectedDoctor.id, selectedDate);
        const data = slotRes?.data || {};
        setAvailableSlots(data.allSlots || []);
        setBookedSlots(data.bookedSlots || []);
        setMySlots(data.mySlots || []);
        setMyAppointments(data.myAppointments || []);
        setUnavailableSlots(data.unavailableSlots || []);
        setPastSlots(data.pastSlots || []);
        setSelectedSlot('');
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to cancel appointment.',
      });
    }
  };

  const calculateUnavailableDatesFromLeaves = (leaves) => {
    if (!leaves || !Array.isArray(leaves)) return [];
    const dates = new Set();
    leaves.forEach(leave => {
      let currentDate = new Date(leave.from_date);
      const endDate = new Date(leave.to_date);
      while (currentDate <= endDate) {
        dates.add(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    return Array.from(dates);
  };

  const leaveDates = calculateUnavailableDatesFromLeaves(selectedDoctor?.leaves);

  // Filtered doctors for Step 1
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.qualification.toLowerCase().includes(doctorSearch.toLowerCase());
    
    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'today' && doc.availability_status === 'available');

    return matchesSearch && matchesAvailability;
  });

  const selectedDepartment = departments.find((d) => d.id === selectedDeptId);

  // Final booking action from Step 3
  const handleConfirmAndBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setErrorMsg('Please select a doctor, consultation date, and time slot.');
      return;
    }
    if (!bloodGroup) {
      setErrorMsg('Please select your blood group.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        doctor_id: selectedDoctor.id,
        department_id: selectedDeptId,
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        blood_group: bloodGroup,
        reason: reason || 'Routine Consultation',
        source: 'manual',
      };

      if (switchTargetAppointment?.id) {
        payload.existing_appointment_id = switchTargetAppointment.id;
      }

      const res = await bookAppointment(payload);

      if (res?.success && res?.data) {
        setConfirmedAppt({
          ...res.data,
          doctorName: selectedDoctor.name,
          department: selectedDepartment?.name || 'General Medicine',
          isSwitched: !!switchTargetAppointment?.id,
        });
        setToast({
          type: 'success',
          message: res?.message || (switchTargetAppointment ? 'Appointment rescheduled successfully.' : 'Appointment booked successfully.'),
        });
        setCurrentStep(4); // Advance to Step 4: Confirmed
      }
    } catch (err) {
      console.error('Booking error:', err);
      const message =
        err.response?.data?.message ||
        'The selected slot is no longer available. Please select another slot.';
      setErrorMsg(message);
      setToast({
        type: 'error',
        message,
      });

      // If slot conflict (HTTP 409), reload slots and bounce back to Slot step
      if (err.response?.status === 409) {
        try {
          const res = await getAvailableSlots(selectedDoctor.id, selectedDate);
          const data = res?.data || {};
          setAvailableSlots(data.allSlots || []);
          setBookedSlots(data.bookedSlots || []);
          setMySlots(data.mySlots || []);
          setMyAppointments(data.myAppointments || []);
          setUnavailableSlots(data.unavailableSlots || []);
          setPastSlots(data.pastSlots || []);
        } catch (e) {
          console.error(e);
        }
        setSelectedSlot('');
        setCurrentStep(2); // Return to slot picker
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedDeptId(null);
    setSelectedDoctor(null);
    setSelectedSlot('');
    setBloodGroup('');
    setReason('');
    setDoctorSearch('');
    setConfirmedAppt(null);
    setSwitchTargetAppointment(null);
    setMySlots([]);
    setMyAppointments([]);
    setPastSlots([]);
    setErrorMsg('');
  };

  const handleSwitchDoctor = (appt) => {
    const target = appt || confirmedAppt;
    setSwitchTargetAppointment(target);
    const deptId = target?.department_id || target?.department?.id || selectedDeptId;
    if (deptId) setSelectedDeptId(deptId);
    setSelectedDoctor(null);
    setSelectedSlot('');
    setCurrentStep(1); // Return directly to Doctor Selection step
  };

  return (
    <DashboardShell role="patient" title="Schedule Specialist Consultation">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs transition-all animate-in fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'orange'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : toast.type === 'orange' ? (
                <RotateCw className="w-4 h-4 text-amber-600 flex-shrink-0 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Multi-step progress bar */}
        <StepProgress steps={STEPS} currentStep={currentStep} />

        {/* Switch Doctor Active Notice Banner */}
        {switchTargetAppointment && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCw className="w-4 h-4 text-amber-600 animate-spin [animation-duration:8s]" />
              </div>
              <div>
                <span className="font-bold text-amber-950 block">Switching Doctor for Appointment #{switchTargetAppointment.id}</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Currently assigned: <span className="font-semibold">Dr. {switchTargetAppointment.doctor?.name || 'Previous Physician'}</span> ({selectedDepartment?.name || 'Department'}). Select your new doctor below.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSwitchTargetAppointment(null);
                setCurrentStep(0);
              }}
              className="text-[11px] font-bold text-amber-900 hover:text-rose-700 underline shrink-0 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
            >
              Cancel Switch
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* STEP 0: Select Department */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">1. Select Medical Department</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a specialty to view consulting doctors, schedules, and clinical fees
                  </p>
                </div>
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
                  Step 1 of 5
                </span>
              </div>
            </div>

            <DepartmentSelect
              departments={departments}
              selectedId={selectedDeptId}
              onSelect={(id) => {
                setSelectedDeptId(id);
                setCurrentStep(1);
              }}
            />
          </div>
        )}

        {/* STEP 1: Select Doctor (with search + filter) */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">2. Choose Consulting Doctor</h3>
                    {selectedDepartment && (
                      <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                        {selectedDepartment.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by specialty, check live availability badge, patient ratings, and consultation fee
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(0)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Department
                </button>
              </div>

              {/* Search & Filter bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search doctor by name, qualification, or sub-specialty..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
                  />
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-500 focus:bg-white"
                  >
                    <option value="all">All Doctors</option>
                    <option value="today">Available Today Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  isSelected={selectedDoctor?.id === doc.id}
                  onSelect={(doc) => {
                    setSelectedDoctor(doc);
                    setCurrentStep(2); // Advance to date/slot picker
                  }}
                />
              ))}
            </div>

            {filteredDoctors.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No doctors match your criteria</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try clearing the search query or switching to 'All Doctors'.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDoctorSearch('');
                    setAvailabilityFilter('all');
                  }}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Pick Date & Time Slot */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">3. Select Date & Time Slot</h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Dr. {selectedDoctor?.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick your preferred consultation slot from the 7-day calendar. Conflicting slots are locked in real-time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3.5 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors shadow-2xs"
              >
                <RotateCw className="w-3.5 h-3.5 text-brand-600" />
                <span>Switch Doctor</span>
              </button>
            </div>

            {/* 7-Day Slot Picker with morning/afternoon/evening groups */}
            <SlotPicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              slots={availableSlots}
              bookedSlots={bookedSlots}
              mySlots={mySlots}
              myAppointments={myAppointments}
              unavailableSlots={unavailableSlots}
              pastSlots={pastSlots}
              isDayUnavailable={isDayUnavailable}
              unavailabilityReason={unavailabilityReason}
              doctorUnavailabilities={doctorUnavailabilities}
              unavailableDates={leaveDates}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              onCancelAppointment={handleCancelFromSlot}
            />

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctor
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-2.5 px-4 rounded-xl border border-brand-200 bg-brand-50/70 text-brand-700 text-xs font-bold hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-600" />
                  <span>Switch Doctor</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedSlot || isDayUnavailable || unavailableSlots.includes(selectedSlot)}
                onClick={() => setCurrentStep(3)} // Proceed to Patient Details confirmation
                className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-40 transition-all inline-flex items-center gap-2"
              >
                <span>Proceed to Patient Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm Patient Details & Consultation Breakdown */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">4. Verify Patient Details & Consultation Review</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your auto-filled identity details and provide visit reasons before finalizing
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change Slot
              </button>
            </div>

            <BookingForm
              doctor={selectedDoctor}
              date={selectedDate}
              slot={selectedSlot}
              department={selectedDepartment}
              bloodGroup={bloodGroup}
              onBloodGroupChange={setBloodGroup}
              reason={reason}
              onReasonChange={setReason}
            />

            {/* Final Booking Submission Bar */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="py-2.5 px-5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Schedule
              </button>

              <button
                type="button"
                onClick={handleConfirmAndBook}
                disabled={loading}
                className="py-3.5 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Updating with Hospital System...'
                    : switchTargetAppointment
                    ? 'Confirm & Switch Doctor'
                    : 'Confirm & Book Appointment'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmation & Success Screen */}
        {currentStep === 4 && (
          <ConfirmationScreen
            appointment={confirmedAppt}
            onReset={handleReset}
            onSwitchDoctor={handleSwitchDoctor}
          />
        )}
      </div>
    </DashboardShell>
  );
};

export default BookAppointment;
