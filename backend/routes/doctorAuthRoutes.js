const express = require('express');
const router = express.Router();
const { doctorLogin, getDoctorProfile, changePassword } = require('../controllers/doctorAuthController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public
router.post('/login', authLimiter, doctorLogin);

// Protected (Doctor only)
router.get('/me', verifyToken, authorizeRoles('doctor'), getDoctorProfile);
router.patch('/me/change-password', verifyToken, authorizeRoles('doctor'), changePassword);

module.exports = router;
