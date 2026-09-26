const express = require('express');
const router = express.Router();
const { registerPatient, patientLogin, getPatientProfile } = require('../controllers/patientAuthController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { authLimiter, patientLoginLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerPatient);
router.post('/login', patientLoginLimiter, patientLogin);
router.get('/me', verifyToken, authorizeRoles('patient'), getPatientProfile);

module.exports = router;
