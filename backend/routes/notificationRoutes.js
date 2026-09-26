const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAllAsRead,
  markSingleAsRead,
} = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

// Protected routes for any authenticated user (doctor, patient, admin)
router.get('/', verifyToken, getNotifications);
router.patch('/read-all', verifyToken, markAllAsRead);
router.patch('/:id/read', verifyToken, markSingleAsRead);

module.exports = router;
