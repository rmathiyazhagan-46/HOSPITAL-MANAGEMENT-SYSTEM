const express = require('express');
const router = express.Router();
const { adminLogin, adminSeed, getAdminProfile, changePassword } = require('../controllers/adminAuthController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, adminLogin);
router.post('/seed', adminSeed);
router.get('/me', verifyToken, authorizeRoles('admin'), getAdminProfile);
router.patch('/me/change-password', verifyToken, authorizeRoles('admin'), changePassword);

module.exports = router;
