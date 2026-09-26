const express = require('express');
const router = express.Router();
const { sendSms, getSmsConfigStatus } = require('../utils/smsService');

/**
 * GET /api/sms/status
 * Returns current SMS service configuration status (live vs sandbox)
 */
router.get('/status', (req, res) => {
  const status = getSmsConfigStatus();
  return res.status(200).json({
    success: true,
    data: status,
  });
});

/**
 * POST /api/sms/test
 * Sends a live or sandbox test SMS
 * Body: { phone: string, message?: string }
 */
router.post('/test', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required. Format: 10-digit number or E.164 (e.g., +919876543210).',
    });
  }

  const testMessage = message || `PulseCare HMS: This is a test SMS verification dispatched on ${new Date().toLocaleString()}.`;
  const result = await sendSms({ to: phone, message: testMessage });

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.mode === 'twilio_live'
        ? 'Live SMS sent successfully via Twilio!'
        : 'Sandbox simulation SMS logged successfully. To send real SMS, configure Twilio credentials in backend/.env.',
      result,
    });
  } else {
    return res.status(400).json({
      success: false,
      message: `Failed to send SMS: ${result.error}`,
      result,
    });
  }
});

/**
 * POST /api/sms/send-otp
 * Dispatches an official OTP via Twilio Verify (works directly with trial accounts in India!)
 * Body: { phone: string }
 */
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required.' });
  }

  const { sendOtpSms } = require('../utils/smsService');
  const result = await sendOtpSms({ phone });

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: 'OTP SMS sent successfully to your mobile number!',
      result,
    });
  } else {
    return res.status(400).json({
      success: false,
      message: `Failed to send OTP: ${result.error}`,
      result,
    });
  }
});

/**
 * POST /api/sms/verify-otp
 * Verifies the OTP entered by user
 * Body: { phone: string, code: string }
 */
router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
  }

  const { verifyOtpCode } = require('../utils/smsService');
  const result = await verifyOtpCode({ phone, code });

  return res.status(result.success ? 200 : 400).json(result);
});

module.exports = router;

