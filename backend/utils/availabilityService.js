const { DoctorLeave, DoctorAvailability } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculates a doctor's availability status for a specific date.
 * Relies exclusively on leave records.
 * @param {number} doctorId - ID of the doctor
 * @param {string} date - Date in 'YYYY-MM-DD' format
 * @param {object} t - Optional transaction
 * @returns {object} { available: boolean, status: string }
 */
const getDoctorAvailability = async (doctorId, date, t = null) => {
  const queryOptions = {
    where: {
      doctor_id: doctorId,
      status: 'Approved',
      from_date: { [Op.lte]: date },
      to_date: { [Op.gte]: date }
    }
  };
  if (t) {
    queryOptions.transaction = t;
  }

  const approvedLeave = await DoctorLeave.findOne(queryOptions);

  if (approvedLeave) {
    return {
      available: false,
      status: 'Today Unavailable'
    };
  }

  // Also check DoctorAvailability for full-day leaves/exclusions (direct date or recurring day of week)
  const targetDateObj = new Date(`${date}T00:00:00`);
  const targetDayOfWeek = isNaN(targetDateObj.getTime()) ? null : targetDateObj.getDay();

  const unavailConditions = [
    { date, time_slot: null }
  ];
  if (targetDayOfWeek !== null) {
    unavailConditions.push({
      is_recurring: true,
      recurring_day_of_week: targetDayOfWeek,
      time_slot: null
    });
  }

  const availQueryOptions = {
    where: {
      doctor_id: doctorId,
      [Op.or]: unavailConditions
    }
  };
  if (t) {
    availQueryOptions.transaction = t;
  }

  const fullDayUnavail = await DoctorAvailability.findOne(availQueryOptions);
  if (fullDayUnavail) {
    return {
      available: false,
      status: 'Today Unavailable'
    };
  }

  return {
    available: true,
    status: 'Available Today'
  };
};

module.exports = {
  getDoctorAvailability
};
