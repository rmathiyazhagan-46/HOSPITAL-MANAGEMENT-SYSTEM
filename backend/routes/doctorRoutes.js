const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAppointments,
  recordConsultationAndPrescription,
} = require('../controllers/doctorController');
const {
  addDoctorAvailability,
  getDoctorAvailabilities,
  deleteDoctorAvailability,
} = require('../controllers/doctorAvailabilityController');
const {
  applyLeave,
  getDoctorLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  adminApplyLeave
} = require('../controllers/doctorLeaveController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public / Patient accessible: Directory of doctors
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Doctor Availability Management (Doctor themselves or Admin; viewable by Doctor, Admin, Patient)
router.post('/:doctorId/availability', verifyToken, authorizeRoles('doctor', 'admin'), addDoctorAvailability);
router.get('/:doctorId/availability', verifyToken, authorizeRoles('doctor', 'admin', 'patient'), getDoctorAvailabilities);
router.delete('/:doctorId/availability/:id', verifyToken, authorizeRoles('doctor', 'admin'), deleteDoctorAvailability);

// Admin only: Full Doctor Management CRUD
router.post('/', verifyToken, authorizeRoles('admin'), createDoctor);
router.put('/:id', verifyToken, authorizeRoles('admin'), updateDoctor);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteDoctor);

// Doctor portal: Clinical queue and consultation recording (Doctor only)
router.get('/portal/appointments', verifyToken, authorizeRoles('doctor'), getDoctorAppointments);
router.post('/portal/consultation', verifyToken, authorizeRoles('doctor'), recordConsultationAndPrescription);

// Doctor Leaves (Doctor Portal)
router.post('/portal/leaves', verifyToken, authorizeRoles('doctor'), applyLeave);
router.get('/portal/leaves', verifyToken, authorizeRoles('doctor'), getDoctorLeaves);

// Doctor Leaves (Admin Portal)
router.get('/leaves/all', verifyToken, authorizeRoles('admin'), getAllLeaves);
router.put('/leaves/:id/approve', verifyToken, authorizeRoles('admin'), approveLeave);
router.put('/leaves/:id/reject', verifyToken, authorizeRoles('admin'), rejectLeave);
router.post('/leaves/admin-apply', verifyToken, authorizeRoles('admin'), adminApplyLeave);

module.exports = router;
