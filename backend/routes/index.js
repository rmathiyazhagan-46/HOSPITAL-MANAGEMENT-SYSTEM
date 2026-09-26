const express = require('express');
const router = express.Router();

const adminAuthRoutes = require('./adminAuthRoutes');
const doctorAuthRoutes = require('./doctorAuthRoutes');
const patientAuthRoutes = require('./patientAuthRoutes');
const doctorRoutes = require('./doctorRoutes');
const patientRoutes = require('./patientRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const pharmacyRoutes = require('./pharmacyRoutes');
const billingRoutes = require('./billingRoutes');
const chatbotRoutes = require('./chatbotRoutes');
const notificationRoutes = require('./notificationRoutes');
const smsRoutes = require('./smsRoutes');

router.use('/auth/admin', adminAuthRoutes);
router.use('/auth/doctor', doctorAuthRoutes);
router.use('/auth/patient', patientAuthRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/pharmacy', pharmacyRoutes);
router.use('/billing', billingRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sms', smsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    message: 'Hospital Management System API is operating normally.',
    hospital_upi_id: process.env.HOSPITAL_UPI_ID || 'gangaganga2235@oksbi',
    hospital_name: process.env.HOSPITAL_NAME || 'Metro General Apex Hospital',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
