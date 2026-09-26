const { Op } = require('sequelize');
const { Doctor, DoctorAvailability, DoctorLeave } = require('../models');

// Add an unavailability entry for a doctor (Doctor themselves or Admin)
const addDoctorAvailability = async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.doctorId, 10);
    const { date, time_slot, is_recurring, recurring_day_of_week, reason } = req.body;

    if (!doctorId || isNaN(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID.' });
    }

    // Role-based authorization check: Doctor can only modify their own availability
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to manage your own availability schedule.',
      });
    }

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    // Calculate recurring day of week (0 = Sunday, 6 = Saturday) if recurring is selected
    let dayOfWeek = null;
    if (is_recurring) {
      if (recurring_day_of_week !== undefined && recurring_day_of_week !== null) {
        dayOfWeek = parseInt(recurring_day_of_week, 10);
      } else {
        const parsedDate = new Date(`${date}T00:00:00`);
        dayOfWeek = parsedDate.getDay();
      }
    }

    const formattedSlot = time_slot && String(time_slot).trim() ? String(time_slot).trim() : null;

    // Check if an identical entry already exists
    const existingEntry = await DoctorAvailability.findOne({
      where: {
        doctor_id: doctorId,
        date,
        time_slot: formattedSlot,
      },
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: formattedSlot
          ? `Slot "${formattedSlot}" on ${date} is already marked as unavailable.`
          : `Date ${date} is already marked as fully unavailable.`,
      });
    }

    const newAvailability = await DoctorAvailability.create({
      doctor_id: doctorId,
      date,
      time_slot: formattedSlot,
      is_recurring: !!is_recurring,
      recurring_day_of_week: dayOfWeek,
      reason: reason || 'Unavailable / Leave',
    });

    // If full-day exclusion, also sync with DoctorLeave with status Approved so it appears in Admin Leave records
    if (!formattedSlot && !is_recurring) {
      try {
        await DoctorLeave.findOrCreate({
          where: {
            doctor_id: doctorId,
            from_date: date,
            to_date: date,
          },
          defaults: {
            doctor_id: doctorId,
            from_date: date,
            to_date: date,
            reason: reason || 'Full day leave',
            status: 'Approved',
          },
        });
      } catch (err) {
        console.error('Error syncing DoctorLeave:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: formattedSlot
        ? `Slot "${formattedSlot}" on ${date} marked as unavailable.`
        : `Full day ${date} marked as unavailable.`,
      data: newAvailability,
    });
  } catch (error) {
    next(error);
  }
};

// List a doctor's unavailability entries (Doctor, Admin, Patient)
const getDoctorAvailabilities = async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.doctorId, 10);
    const { startDate, endDate } = req.query;

    if (!doctorId || isNaN(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID.' });
    }

    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ['id', 'name', 'employee_id', 'specialization', 'availability_status'],
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const where = { doctor_id: doctorId };

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    }

    const availabilities = await DoctorAvailability.findAll({
      where,
      order: [['date', 'ASC'], ['time_slot', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      doctor,
      data: availabilities,
    });
  } catch (error) {
    next(error);
  }
};

// Remove/undo an unavailability entry (Doctor themselves or Admin)
const deleteDoctorAvailability = async (req, res, next) => {
  try {
    const doctorId = parseInt(req.params.doctorId, 10);
    const availabilityId = parseInt(req.params.id, 10);

    if (!doctorId || isNaN(doctorId) || !availabilityId || isNaN(availabilityId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID parameter.' });
    }

    const availability = await DoctorAvailability.findByPk(availabilityId);
    if (!availability) {
      return res.status(404).json({ success: false, message: 'Availability record not found.' });
    }

    if (availability.doctor_id !== doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Availability entry does not belong to the specified doctor.',
      });
    }

    // Role-based authorization: Doctor can only delete their own
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to remove your own availability entries.',
      });
    }

    await availability.destroy();

    // If full-day exclusion, clean up synced DoctorLeave entry as well
    if (!availability.time_slot && !availability.is_recurring) {
      try {
        await DoctorLeave.destroy({
          where: {
            doctor_id: availability.doctor_id,
            from_date: availability.date,
            to_date: availability.date,
          },
        });
      } catch (err) {
        console.error('Error removing synced DoctorLeave:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Unavailability entry removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addDoctorAvailability,
  getDoctorAvailabilities,
  deleteDoctorAvailability,
};
