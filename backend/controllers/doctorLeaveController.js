const { DoctorLeave, Doctor, Department } = require('../models');
const { Op } = require('sequelize');

// Apply for leave (Doctor)
const applyLeave = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { from_date, to_date, reason } = req.body;

    if (!from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'From Date, To Date, and Reason are required.' });
    }

    if (new Date(to_date) < new Date(from_date)) {
      return res.status(400).json({ success: false, message: 'To Date cannot be earlier than From Date.' });
    }

    // Check for overlapping leaves
    const existingLeave = await DoctorLeave.findOne({
      where: {
        doctor_id: doctorId,
        status: { [Op.in]: ['Pending', 'Approved'] },
        [Op.or]: [
          {
            from_date: { [Op.lte]: to_date },
            to_date: { [Op.gte]: from_date }
          }
        ]
      }
    });

    if (existingLeave) {
      return res.status(400).json({ success: false, message: 'You already have a leave request during this period.' });
    }

    const leave = await DoctorLeave.create({
      doctor_id: doctorId,
      from_date,
      to_date,
      reason,
      status: 'Pending'
    });

    return res.status(201).json({ success: true, message: 'Leave request submitted successfully and is pending admin approval.', data: leave });
  } catch (error) {
    next(error);
  }
};

// Get leaves for logged in doctor
const getDoctorLeaves = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const leaves = await DoctorLeave.findAll({
      where: { doctor_id: doctorId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
};

// Get all leaves (Admin)
const getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await DoctorLeave.findAll({
      include: [{
        model: Doctor,
        as: 'doctor',
        attributes: ['id', 'name', 'employee_id', 'department_id', 'specialization'],
        include: [{ model: Department, as: 'department', attributes: ['name'] }]
      }],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
};

// Approve leave (Admin)
const approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await DoctorLeave.findByPk(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    // Optional: Check if there's any other overlapping APPROVED leave for this doctor just in case
    const overlappingApprove = await DoctorLeave.findOne({
      where: {
        id: { [Op.ne]: id },
        doctor_id: leave.doctor_id,
        status: 'Approved',
        [Op.or]: [
          {
            from_date: { [Op.lte]: leave.to_date },
            to_date: { [Op.gte]: leave.from_date }
          }
        ]
      }
    });

    if (overlappingApprove) {
      return res.status(400).json({ success: false, message: 'Doctor already has an approved leave overlapping this period.' });
    }

    await leave.update({ status: 'Approved' });

    return res.status(200).json({ success: true, message: 'Leave request approved.', data: leave });
  } catch (error) {
    next(error);
  }
};

// Reject leave (Admin)
const rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await DoctorLeave.findByPk(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    await leave.update({ status: 'Rejected' });

    return res.status(200).json({ success: true, message: 'Leave request rejected.', data: leave });
  } catch (error) {
    next(error);
  }
};

// Admin apply leave on behalf of a doctor
const adminApplyLeave = async (req, res, next) => {
  try {
    const { doctor_id, from_date, to_date, reason } = req.body;

    if (!doctor_id || !from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'Doctor ID, From Date, To Date, and Reason are required.' });
    }

    if (new Date(to_date) < new Date(from_date)) {
      return res.status(400).json({ success: false, message: 'To Date cannot be earlier than From Date.' });
    }

    // Check for overlapping APPROVED leaves
    const existingLeave = await DoctorLeave.findOne({
      where: {
        doctor_id,
        status: 'Approved',
        [Op.or]: [
          {
            from_date: { [Op.lte]: to_date },
            to_date: { [Op.gte]: from_date }
          }
        ]
      }
    });

    if (existingLeave) {
      return res.status(400).json({ success: false, message: 'Doctor already has an approved leave overlapping this period.' });
    }

    const leave = await DoctorLeave.create({
      doctor_id,
      from_date,
      to_date,
      reason,
      status: 'Approved' // Auto-approve if admin creates it
    });

    return res.status(201).json({ success: true, message: 'Leave applied and approved successfully.', data: leave });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getDoctorLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  adminApplyLeave
};
