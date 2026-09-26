const express = require('express');
const router = express.Router();
const { handleChatMessage, getPatientTrackingStatus } = require('../controllers/chatbotController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Chatbot message endpoint - strictly patient-facing (rejects Admin & Doctor tokens with 403)
router.post('/message', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(
        authHeader.split(' ')[1],
        process.env.JWT_SECRET || 'super_secret_jwt_key_hms_2026_secure_token'
      );
      if (decoded.role === 'admin' || decoded.role === 'doctor') {
        return res.status(403).json({
          success: false,
          message: `Forbidden. Role '${decoded.role}' does not have access to Patient AI Chatbot.`,
        });
      }
      // Attach verified patient info to request object
      req.user = decoded;
    } catch (e) {
      // Allow unauthenticated guests for initial symptom inquiry
    }
  }
  handleChatMessage(req, res, next);
});

// Real-time appointment and report tracking endpoint for logged-in patients
router.get('/track', verifyToken, authorizeRoles('patient'), getPatientTrackingStatus);
router.get('/track/:appointmentId', verifyToken, authorizeRoles('patient'), getPatientTrackingStatus);

module.exports = router;
