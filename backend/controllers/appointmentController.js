const { jsPDF } = require('jspdf');
const { Op, Transaction } = require('sequelize');
const jwt = require('jsonwebtoken');
const { 
  sequelize,
  Appointment, 
  Doctor, 
  Patient, 
  Department,
  Invoice,
  Notification,
  DoctorAvailability,
  DoctorLeave,
  Consultation,
  Prescription,
} = require('../models');
const { sendDoctorAppointmentSms } = require('../utils/smsService');
const { getDoctorAvailability } = require('../utils/availabilityService');

// Standard slots for doctors
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

// Helper to determine if a date + slot has elapsed in local time (Asia/Kolkata)
const isSlotInPast = (dateStr, slotStr) => {
  if (!dateStr || !slotStr) return false;
  
  // Get current time in Asia/Kolkata
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // Same day: check start time of slot
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

// Book or switch appointment with transaction and pessimistic row lock for concurrency safety
const bookAppointment = async (req, res, next) => {
  try {
    const {
      doctor_id,
      department_id,
      appointment_date,
      time_slot,
      blood_group,
      source = 'manual',
      reason = '',
      existing_appointment_id,
    } = req.body;

    const patient_id = req.user.role === 'patient' ? req.user.id : req.body.patient_id;

    if (!doctor_id || !appointment_date || !time_slot || !blood_group) {
      return res.status(400).json({
        success: false,
        message: 'Doctor, appointment date, time slot, and blood group are required.',
      });
    }

    // Backend validation: reject past date or past time slot
    if (isSlotInPast(appointment_date, time_slot)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book an appointment for a past date or time slot.',
      });
    }

    // Determine department_id if not provided
    let finalDeptId = department_id;
    if (!finalDeptId) {
      const doc = await Doctor.findByPk(doctor_id);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }
      finalDeptId = doc.department_id;
    }

    // Execute within a database transaction with pessimistic locking
    let populatedAppointment;
    let isSwitch = false;

    const txOptions = {};
    if (sequelize.getDialect() === 'sqlite' && Transaction && Transaction.TYPES && Transaction.TYPES.IMMEDIATE) {
      txOptions.type = Transaction.TYPES.IMMEDIATE;
    }

    try {
      populatedAppointment = await sequelize.transaction(txOptions, async (t) => {
        let existingAppt = null;
        if (existing_appointment_id) {
          existingAppt = await Appointment.findByPk(existing_appointment_id, {
            transaction: t,
            lock: t.LOCK ? t.LOCK.UPDATE : true,
          });
          if (!existingAppt) {
            const err = new Error('Existing appointment to switch not found.');
            err.statusCode = 404;
            throw err;
          }
          if (req.user.role === 'patient' && existingAppt.patient_id !== patient_id) {
            const err = new Error('Unauthorized to modify this appointment.');
            err.statusCode = 403;
            throw err;
          }
          if (existingAppt.status === 'completed' || existingAppt.status === 'cancelled') {
            const err = new Error('Cannot reschedule an appointment that is already completed or cancelled.');
            err.statusCode = 400;
            throw err;
          }
          if (isSlotInPast(existingAppt.appointment_date, existingAppt.time_slot)) {
            const err = new Error('Cannot reschedule an appointment that has already passed.');
            err.statusCode = 400;
            throw err;
          }
          isSwitch = true;
        }

        // Verify doctor exists and lock doctor row to serialize concurrent booking requests
        const targetDoctor = await Doctor.findByPk(doctor_id, {
          transaction: t,
          lock: t.LOCK ? t.LOCK.UPDATE : true,
        });
        if (!targetDoctor) {
          const err = new Error('Doctor not found.');
          err.statusCode = 404;
          throw err;
        }
        if (['on_leave', 'inactive'].includes(targetDoctor.availability_status)) {
          const err = new Error(`Doctor is currently marked as ${targetDoctor.availability_status.replace('_', ' ')} and is not available for bookings.`);
          err.statusCode = 409;
          throw err;
        }

        // Check if doctor has an approved leave on this date
        const availObj = await getDoctorAvailability(doctor_id, appointment_date, t);

        if (!availObj.available) {
          const err = new Error('Doctor is unavailable on this date due to leave.');
          err.statusCode = 409;
          throw err;
        }

        // Check doctor-set unavailability (both specific date and recurring weekly off-days)
        const apptDateObj = new Date(`${appointment_date}T00:00:00`);
        const apptDayOfWeek = isNaN(apptDateObj.getTime()) ? null : apptDateObj.getDay();

        const unavailConditions = [
          {
            date: appointment_date,
            [Op.or]: [
              { time_slot: null },
              { time_slot: time_slot },
            ],
          },
        ];

        if (apptDayOfWeek !== null) {
          unavailConditions.push({
            is_recurring: true,
            recurring_day_of_week: apptDayOfWeek,
            [Op.or]: [
              { time_slot: null },
              { time_slot: time_slot },
            ],
          });
        }

        const unavailabilityConflict = await DoctorAvailability.findOne({
          where: {
            doctor_id,
            [Op.or]: unavailConditions,
          },
          transaction: t,
        });

        if (unavailabilityConflict) {
          const reasonSuffix = unavailabilityConflict.reason ? ` (${unavailabilityConflict.reason})` : '';
          const err = new Error(`The doctor is not available on this date or time slot${reasonSuffix}. Please choose another slot.`);
          err.statusCode = 409;
          throw err;
        }

        // Strict conflict check inside transaction using composite index + row update lock
        const conflictWhere = {
          doctor_id,
          appointment_date,
          time_slot,
          status: ['pending', 'confirmed'],
        };

        if (existingAppt) {
          conflictWhere.id = { [Op.ne]: existingAppt.id };
        }

        const existingConflict = await Appointment.findOne({
          where: conflictWhere,
          transaction: t,
          lock: t.LOCK ? t.LOCK.UPDATE : true,
        });

        if (existingConflict) {
          const err = new Error('Slot Unavailable: The selected doctor is already booked for this time slot. Please choose another slot.');
          err.statusCode = 409;
          throw err;
        }

        let appointment;
        if (existingAppt) {
          await existingAppt.update({
            doctor_id,
            department_id: finalDeptId,
            appointment_date,
            time_slot,
            blood_group,
            reason: reason || existingAppt.reason,
            status: 'pending',
            confirmed_at: null,
            completed_at: null,
            consultation_notes: null,
            prescription_id: null,
            source,
          }, { transaction: t });
          appointment = existingAppt;
        } else {
          appointment = await Appointment.create({
            patient_id,
            doctor_id,
            department_id: finalDeptId,
            appointment_date,
            time_slot,
            blood_group,
            reason: reason || 'Routine Consultation',
            status: 'pending',
            confirmed_at: null,
            completed_at: null,
            consultation_notes: null,
            prescription_id: null,
            source,
          }, { transaction: t });
        }

        // DO NOT generate a consultation invoice at booking time anymore
        const populated = await Appointment.findByPk(appointment.id, {
          include: [
            { model: Doctor, as: 'doctor', attributes: ['id', 'name', 'phone', 'specialization', 'consultation_fee', 'qualification'] },
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: Patient, as: 'patient', attributes: ['id', 'name', 'patient_id', 'phone', 'email'] },
          ],
          transaction: t,
        });

        const apptData = populated.toJSON();
        apptData.invoice = null; // No invoice on booking
        return apptData;
      });
    } catch (txErr) {
      if (txErr.statusCode) {
        return res.status(txErr.statusCode).json({
          success: false,
          message: txErr.message,
        });
      }
      throw txErr;
    }

    // Trigger Doctor Notification & Doctor SMS (Non-blocking)
    const patientName = populatedAppointment?.patient?.name || 'A patient';
    const doctorName = populatedAppointment?.doctor?.name;
    const doctorPhone = populatedAppointment?.doctor?.phone;

    // 1. In-App Notification row for Doctor
    try {
      const notifMsg = isSwitch
        ? `Appointment rescheduled / switched to you by ${patientName} on ${appointment_date} at ${time_slot} (Status: Pending Confirmation)`
        : `New appointment booked by ${patientName} on ${appointment_date} at ${time_slot} (Status: Pending Confirmation)`;

      await Notification.create({
        recipient_type: 'doctor',
        recipient_id: doctor_id,
        message: notifMsg,
        is_read: false,
      });
    } catch (notifErr) {
      console.error('[Doctor Notification Failed]:', notifErr.message);
    }

    // 2. Doctor SMS notification via smsService
    try {
      if (doctorPhone) {
        await sendDoctorAppointmentSms({
          doctorPhone,
          doctorName,
          patientName,
          date: appointment_date,
          timeSlot: time_slot,
        });
      }
    } catch (smsErr) {
      console.error('[Doctor SMS Failed]:', smsErr.message);
    }

    return res.status(isSwitch ? 200 : 201).json({
      success: true,
      message: isSwitch
        ? 'Appointment rescheduled successfully.'
        : 'Appointment booked successfully.',
      data: populatedAppointment,
      appointment: populatedAppointment,
      isSwitch,
    });
  } catch (error) {
    next(error);
  }
};

// Check available slots for a doctor on a specific date with Morning/Afternoon/Evening groupings
const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and date query parameters are required.',
      });
    }

    const doctor = await Doctor.findByPk(doctor_id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    // Determine if requester is an authenticated patient to distinguish "Your Appointment"
    let currentPatientId = null;
    if (req.user && req.user.role === 'patient') {
      currentPatientId = req.user.id;
    } else {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_hms_2026_secure_token');
          if (decoded && decoded.role === 'patient') {
            currentPatientId = decoded.id;
          }
        } catch (e) {
          // Proceed unauthenticated if token invalid
        }
      }
    }
    if (!currentPatientId && req.query.patient_id) {
      currentPatientId = parseInt(req.query.patient_id, 10);
    }

    let isDayUnavailable = false;
    let unavailabilityReason = null;

    // Check doctor global availability status
    if (['on_leave', 'inactive'].includes(doctor.availability_status)) {
      isDayUnavailable = true;
      unavailabilityReason = `Doctor is currently ${doctor.availability_status.replace('_', ' ')}`;
    }

    // Check if doctor has an approved leave on this date
    const availObj = await getDoctorAvailability(doctor_id, date);

    if (!availObj.available) {
      isDayUnavailable = true;
      unavailabilityReason = 'Doctor is unavailable on this date due to leave.';
    }

    // Query doctor-specific unavailability entries (direct date or recurring day of week)
    const targetDateObj = new Date(`${date}T00:00:00`);
    const targetDayOfWeek = isNaN(targetDateObj.getTime()) ? null : targetDateObj.getDay();

    const unavailConditions = [{ date }];
    if (targetDayOfWeek !== null) {
      unavailConditions.push({
        is_recurring: true,
        recurring_day_of_week: targetDayOfWeek,
      });
    }

    const unavailabilities = await DoctorAvailability.findAll({
      where: {
        doctor_id,
        [Op.or]: unavailConditions,
      },
    });

    // Check if the whole day was marked unavailable (time_slot is null)
    const fullDayUnavail = unavailabilities.find(u => !u.time_slot);
    if (fullDayUnavail) {
      isDayUnavailable = true;
      unavailabilityReason = fullDayUnavail.reason || 'Doctor unavailable for the full day';
    }

    // Specific unavailable slots
    const unavailableSlots = unavailabilities
      .filter(u => !!u.time_slot)
      .map(u => u.time_slot);

    // Booked slots from existing pending/confirmed appointments
    const booked = await Appointment.findAll({
      where: {
        doctor_id,
        appointment_date: date,
        status: ['pending', 'confirmed'],
      },
      attributes: ['id', 'patient_id', 'time_slot', 'status'],
    });

    const myAppointments = booked.filter(b => currentPatientId && b.patient_id === currentPatientId);
    const mySlots = myAppointments.map(b => b.time_slot);

    const bookedByOthers = booked.filter(b => !currentPatientId || b.patient_id !== currentPatientId);
    const bookedSlots = bookedByOthers.map(b => b.time_slot);

    // Calculate past slots for this date
    const pastSlots = ALL_SLOTS.filter(s => isSlotInPast(date, s));

    const availableSlots = isDayUnavailable
      ? []
      : ALL_SLOTS.filter(slot => 
          !bookedSlots.includes(slot) && 
          !mySlots.includes(slot) && 
          !unavailableSlots.includes(slot) &&
          !pastSlots.includes(slot)
        );

    // Group slots into time periods with 4 clear states:
    // 1. Available, 2. Booked (other patient), 3. Your Appointment (current patient), 4. Past/Expired
    const morningSlots = ALL_SLOTS.filter(s => s.startsWith('09') || s.startsWith('10') || s.startsWith('11'));
    const afternoonSlots = ALL_SLOTS.filter(s => s.startsWith('14') || s.startsWith('15'));
    const eveningSlots = ALL_SLOTS.filter(s => s.startsWith('16') || s.startsWith('17'));

    const mapSlotStatus = (s) => {
      const isPast = pastSlots.includes(s);
      const isMyAppointment = mySlots.includes(s);
      const isBooked = bookedSlots.includes(s);
      const isDoctorUnavailable = isDayUnavailable || unavailableSlots.includes(s);
      const myAppt = isMyAppointment ? myAppointments.find(b => b.time_slot === s) : null;

      let state = 'available';
      if (isPast) state = 'past';
      else if (isMyAppointment) state = 'my_appointment';
      else if (isBooked) state = 'booked';
      else if (isDoctorUnavailable) state = 'unavailable';

      return {
        slot: s,
        state, // 'available' | 'booked' | 'my_appointment' | 'past' | 'unavailable'
        isAvailable: state === 'available',
        isBooked,
        isMyAppointment,
        myAppointmentId: myAppt?.id || null,
        isPast,
        isUnavailable: isDoctorUnavailable,
      };
    };

    return res.status(200).json({
      success: true,
      data: {
        allSlots: ALL_SLOTS,
        bookedSlots,
        mySlots,
        myAppointments: myAppointments.map(a => ({ id: a.id, time_slot: a.time_slot, status: a.status })),
        unavailableSlots,
        pastSlots,
        availableSlots,
        isDayUnavailable,
        unavailabilityReason,
        grouped: {
          morning: morningSlots.map(mapSlotStatus),
          afternoon: afternoonSlots.map(mapSlotStatus),
          evening: eveningSlots.map(mapSlotStatus),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Patient / Admin: Cancel an existing appointment with immediate slot release
const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name', 'phone'] },
        { model: Patient, as: 'patient', attributes: ['id', 'name', 'phone'] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // Role-based security check: Patient can only cancel their own appointment
    if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to cancel this appointment.',
      });
    }

    // Cannot cancel if already completed
    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an appointment that has already been completed.',
      });
    }

    // Cannot cancel if already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already cancelled.',
      });
    }

    // Cannot cancel if appointment has already passed
    if (isSlotInPast(appointment.appointment_date, appointment.time_slot)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an appointment that has already passed.',
      });
    }

    // Cancel appointment inside transaction
    const txOptions = {};
    if (sequelize.getDialect() === 'sqlite' && Transaction && Transaction.TYPES && Transaction.TYPES.IMMEDIATE) {
      txOptions.type = Transaction.TYPES.IMMEDIATE;
    }

    await sequelize.transaction(txOptions, async (t) => {
      await appointment.update({ status: 'cancelled' }, { transaction: t });

      // Cancel any pending consultation invoice for this appointment/patient
      const pendingInvoice = await Invoice.findOne({
        where: {
          patient_id: appointment.patient_id,
          invoice_type: 'consultation',
          status: 'pending',
        },
        transaction: t,
      });

      if (pendingInvoice) {
        await pendingInvoice.update({ status: 'cancelled' }, { transaction: t });
      }
    });

    // Notify doctor of cancellation (non-blocking)
    try {
      await Notification.create({
        recipient_type: 'doctor',
        recipient_id: appointment.doctor_id,
        message: `Appointment scheduled on ${appointment.appointment_date} at ${appointment.time_slot} was cancelled by ${appointment.patient?.name || 'patient'}. The slot is now available.`,
        is_read: false,
      });
    } catch (notifErr) {
      console.error('[Cancel Notification Failed]:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully. The time slot has been released.',
      data: {
        id: appointment.id,
        status: 'cancelled',
        released_slot: {
          doctor_id: appointment.doctor_id,
          date: appointment.appointment_date,
          time_slot: appointment.time_slot,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generate and download Appointment Confirmation Slip PDF
const downloadAppointmentConfirmationPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Doctor, as: 'doctor', include: [{ model: Department, as: 'department' }] },
        { model: Patient, as: 'patient' },
        { model: Department, as: 'department' },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Role security check: Patient can only access their own confirmation
    if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to download this appointment confirmation.' });
    }

    const doc = new jsPDF();

    // Primary Header
    doc.setFillColor(30, 64, 175); // Deep Royal Blue
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('METRO GENERAL APEX HOSPITAL', 105, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Center for Medical Excellence & Patient Care | 24/7 Helpline: +91 98765 43210', 105, 18, { align: 'center' });

    // Document Title Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL APPOINTMENT CONFIRMATION SLIP', 14, 38);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated On: ${new Date().toLocaleString()} | Booking Channel: Online Patient Portal`, 14, 44);

    // Appointment Reference Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 50, 182, 22, 3, 3, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, 50, 182, 22, 3, 3, 'D');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`APPOINTMENT ID: #APPT-${appointment.id.toString().padStart(6, '0')}`, 20, 60);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129); // Green
    doc.text('STATUS: CONFIRMED & SLOTTED', 20, 67);

    doc.setTextColor(71, 85, 105);
    doc.text(`Consultation Date: ${appointment.appointment_date}`, 120, 60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Time Slot: ${appointment.time_slot}`, 120, 67);

    // Two Column Grid: Patient Information | Doctor Information
    // Left Box - Patient Details
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 78, 88, 55, 2, 2, 'D');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('PATIENT PARTICULARS', 20, 88);

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${appointment.patient?.name || 'N/A'}`, 20, 96);
    doc.text(`Patient ID: ${appointment.patient?.patient_id || 'N/A'}`, 20, 103);
    doc.text(`Contact Phone: ${appointment.patient?.phone || 'N/A'}`, 20, 110);
    doc.text(`Email: ${appointment.patient?.email || 'N/A'}`, 20, 117);
    doc.text(`DOB: ${appointment.patient?.dob || 'N/A'}`, 20, 124);

    // Right Box - Doctor & Clinic Details
    doc.roundedRect(108, 78, 88, 55, 2, 2, 'D');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('PHYSICIAN & CLINIC', 114, 88);

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`Doctor: ${appointment.doctor?.name || 'Assigned Physician'}`, 114, 96);
    doc.text(`Specialty: ${appointment.doctor?.specialization || 'Clinical Care'}`, 114, 103);
    doc.text(`Department: ${appointment.department?.name || appointment.doctor?.department?.name || 'OPD'}`, 114, 110);
    doc.text(`Cabin / Room: OPD Block B - Cabin ${100 + (appointment.doctor_id % 20)}`, 114, 117);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Consultation Fee: Rs. ${Number(appointment.doctor?.consultation_fee || 500).toFixed(2)}`, 114, 124);

    // Guidelines & Instructions
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 140, 182, 50, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 140, 182, 50, 2, 2, 'D');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('IMPORTANT PATIENT INSTRUCTIONS', 20, 150);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('1. Reporting Time: Please arrive at the hospital reception 15 minutes before your scheduled time slot.', 20, 158);
    doc.text('2. Documentation: Bring this confirmation slip (digital or printed) along with your government ID.', 20, 165);
    doc.text('3. Past Records: Bring any previous medical records, ongoing prescriptions, or recent diagnostic reports.', 20, 172);
    doc.text('4. Cancellation Policy: If you need to reschedule or cancel, please inform at least 2 hours in advance.', 20, 179);

    // Barcode / Verification box placeholder
    doc.setDrawColor(148, 163, 184);
    doc.setLineDash([2, 2]);
    doc.rect(14, 198, 182, 16);
    doc.setLineDash([]);
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`* * * SECURE QR / BARCODE VERIFICATION CODE: MG-APPT-${appointment.id}-${appointment.appointment_date.replace(/-/g, '')} * * *`, 105, 208, { align: 'center' });

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated confirmation document and does not require a physical signature.', 105, 280, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Appointment_Confirmation_${appointment.id}.pdf`);
    return res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    next(error);
  }
};

// Get all appointments (Admin)
const getAllAppointments = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (date) where.appointment_date = date;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name', 'specialization', 'phone', 'consultation_fee'] },
        { model: Patient, as: 'patient', attributes: ['id', 'name', 'patient_id', 'phone', 'email'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Consultation, as: 'consultation' },
        { model: Prescription, as: 'prescription' },
      ],
      order: [['appointment_date', 'DESC'], ['time_slot', 'ASC']],
    });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// Doctor or Admin: Confirm a pending appointment
const confirmAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name', 'phone', 'consultation_fee', 'specialization'] },
        { model: Patient, as: 'patient', attributes: ['id', 'name', 'phone', 'email'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // Role-based authorization:
    // If doctor, must be assigned to this appointment. Admin can confirm for any doctor.
    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only confirm appointments assigned to you.',
      });
    }

    // Validation: only 'pending' appointments can be confirmed
    if (appointment.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'This appointment is already confirmed.',
        data: appointment,
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm an appointment that is already completed.',
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm a cancelled appointment.',
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: Only pending appointments can be confirmed. Current status: ${appointment.status}`,
      });
    }

    const now = new Date();
    await appointment.update({
      status: 'confirmed',
      confirmed_at: now,
    });

    // Send in-app notification to patient
    try {
      await Notification.create({
        recipient_type: 'patient',
        recipient_id: appointment.patient_id,
        message: `Your appointment with Dr. ${appointment.doctor?.name || 'Physician'} on ${appointment.appointment_date} at ${appointment.time_slot} has been confirmed.`,
        is_read: false,
      });
    } catch (notifErr) {
      console.error('[Patient Notification Error]:', notifErr.message);
    }

    // If confirmed by admin, also notify doctor
    if (req.user.role === 'admin') {
      try {
        await Notification.create({
          recipient_type: 'doctor',
          recipient_id: appointment.doctor_id,
          message: `Appointment for ${appointment.patient?.name || 'Patient'} on ${appointment.appointment_date} at ${appointment.time_slot} was confirmed by Admin.`,
          is_read: false,
        });
      } catch (notifErr) {
        console.error('[Doctor Notification Error]:', notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment confirmed successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// Update appointment status with strict stage validation
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const appointment = await Appointment.findByPk(id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['id', 'name'] },
        { model: Patient, as: 'patient', attributes: ['id', 'name'] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Doctor can only update their own appointments
    if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update appointments assigned to you.',
      });
    }

    const currentStatus = appointment.status;

    if (currentStatus === status) {
      return res.status(200).json({
        success: true,
        message: `Appointment is already ${status}.`,
        data: appointment,
      });
    }

    // Terminal states check: Completed or Cancelled cannot be changed
    if (currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of an appointment that has already been completed.',
      });
    }

    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of an appointment that has already been cancelled.',
      });
    }

    // Strict state transitions:
    // pending -> confirmed, pending -> cancelled
    // confirmed -> completed, confirmed -> cancelled
    // pending CANNOT jump directly to completed!
    if (currentStatus === 'pending' && status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition: A pending appointment cannot jump directly to completed. It must be confirmed first.',
      });
    }

    const updateFields = { status };
    if (status === 'confirmed') {
      updateFields.confirmed_at = new Date();
    } else if (status === 'completed') {
      updateFields.completed_at = new Date();
      if (req.body.consultation_notes) {
        updateFields.consultation_notes = req.body.consultation_notes;
      }
      if (req.body.prescription_id) {
        updateFields.prescription_id = req.body.prescription_id;
      }
    }

    await appointment.update(updateFields);

    return res.status(200).json({
      success: true,
      message: `Appointment status updated from ${currentStatus} to ${status}.`,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// Get departments list
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookAppointment,
  getAvailableSlots,
  cancelAppointment,
  getAllAppointments,
  confirmAppointment,
  updateAppointmentStatus,
  getDepartments,
  downloadAppointmentConfirmationPdf,
};
