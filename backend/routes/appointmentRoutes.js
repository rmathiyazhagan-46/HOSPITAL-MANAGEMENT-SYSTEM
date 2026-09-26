const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getAvailableSlots,
  cancelAppointment,
  getAllAppointments,
  confirmAppointment,
  updateAppointmentStatus,
  getDepartments,
  downloadAppointmentConfirmationPdf,
} = require('../controllers/appointmentController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public departments list
router.get('/departments', getDepartments);

// Slot check (can accept optional auth header or query token to identify current patient)
router.get('/available-slots', getAvailableSlots);

// Booking appointment (Patient or Admin)
router.post('/', verifyToken, authorizeRoles('patient', 'admin'), bookAppointment);

// Confirm appointment (Doctor or Admin)
router.patch('/:id/confirm', verifyToken, authorizeRoles('admin', 'doctor'), confirmAppointment);
router.post('/:id/confirm', verifyToken, authorizeRoles('admin', 'doctor'), confirmAppointment);

// Patient-facing / Admin cancel appointment with immediate slot release
router.post('/:id/cancel', verifyToken, authorizeRoles('patient', 'admin'), cancelAppointment);
router.patch('/:id/cancel', verifyToken, authorizeRoles('patient', 'admin'), cancelAppointment);

// Download confirmation slip PDF (Patient, Admin, Doctor)
router.get('/:id/confirmation-pdf', verifyToken, authorizeRoles('patient', 'admin', 'doctor'), downloadAppointmentConfirmationPdf);

// Admin view all appointments
router.get('/', verifyToken, authorizeRoles('admin'), getAllAppointments);

// Update status (Admin / Doctor)
router.patch('/:id/status', verifyToken, authorizeRoles('admin', 'doctor'), updateAppointmentStatus);

module.exports = router;
