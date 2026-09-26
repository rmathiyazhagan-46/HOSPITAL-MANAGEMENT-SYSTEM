const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  updatePatient,
  deletePatient,
  getPatientMedicalRecords,
  getPatientAppointments,
  getPatientInvoices,
  downloadPrescriptionPdf,
} = require('../controllers/patientController');
const { registerPatient } = require('../controllers/patientAuthController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public: Patient Registration
router.post('/register', authLimiter, registerPatient);

// Admin only: Full Patient Management & Directory CRUD
router.get('/', verifyToken, authorizeRoles('admin'), getAllPatients);
router.put('/:id', verifyToken, authorizeRoles('admin'), updatePatient);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deletePatient);

// Patient: Own medical records & PDF prescription download
router.get('/records', verifyToken, authorizeRoles('patient'), getPatientMedicalRecords);
router.get('/consultations/:id/prescription-pdf', verifyToken, authorizeRoles('patient', 'doctor', 'admin'), downloadPrescriptionPdf);

// Doctor & Admin: View clinical history of a specific assigned patient
router.get('/:patientId/records', verifyToken, authorizeRoles('doctor', 'admin'), getPatientMedicalRecords);

// Patient Portal self-service: Appointments & Invoices
router.get('/portal/appointments', verifyToken, authorizeRoles('patient'), getPatientAppointments);
router.get('/portal/invoices', verifyToken, authorizeRoles('patient'), getPatientInvoices);

module.exports = router;
