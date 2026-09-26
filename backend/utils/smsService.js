/**
 * Reusable SMS Notification Service
 * Integrates with Twilio SMS Gateway and provides sandbox/mock fallback for development
 */

/**
 * Resolve Twilio client dynamically based on current environment variables
 */
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Check if real or non-placeholder credentials exist
  if (accountSid && authToken && !accountSid.includes('your_') && !authToken.includes('your_') && accountSid.trim() !== '' && authToken.trim() !== '') {
    try {
      const twilio = require('twilio');
      return twilio(accountSid.trim(), authToken.trim());
    } catch (err) {
      console.warn('[SMS Service] Twilio package not available or failed to initialize:', err.message);
      return null;
    }
  }

  return null;
};

/**
 * Format phone number to E.164 if possible
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const clean = String(phone).replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return clean;
  // If 10 digits (e.g. Indian mobile number), prepend +91
  if (clean.length === 10) return `+91${clean}`;
  return `+${clean}`;
};

/**
 * Inspect SMS configuration status
 */
const getSmsConfigStatus = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  const phone = process.env.TWILIO_PHONE_NUMBER || '';

  const isConfigured = Boolean(
    sid &&
    token &&
    !sid.includes('your_') &&
    !token.includes('your_') &&
    sid.trim() !== '' &&
    token.trim() !== ''
  );

  return {
    isConfigured,
    mode: isConfigured ? 'twilio_live' : 'sandbox',
    accountSidMasked: sid ? `${sid.slice(0, 4)}...${sid.slice(-4)}` : 'Not set',
    hasAuthToken: Boolean(token && !token.includes('your_')),
    phoneNumber: phone && !phone.includes('your_') ? phone : 'Default (+15005550006)',
    help: isConfigured
      ? 'Live Twilio credentials detected. Real SMS messages will be dispatched.'
      : 'Running in sandbox simulation mode. To send real SMS, update TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env.',
  };
};

/**
 * Core send SMS function
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.message - Text message content
 * @returns {Promise<{ success: boolean, messageId?: string, mode: string, error?: string, advice?: string }>}
 */
const sendSms = async ({ to, message }) => {
  const formattedTo = formatPhoneNumber(to);
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+15005550006';

  if (!formattedTo || !message) {
    console.warn('[SMS Service] Missing recipient phone or message body.');
    return { success: false, error: 'Recipient phone and message body are required.', mode: 'error' };
  }

  const client = getTwilioClient();

  if (client) {
    try {
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo,
      });

      console.log(`[SMS Service: Live Twilio] Successfully dispatched SMS to ${formattedTo} (SID: ${result.sid})`);
      return { success: true, messageId: result.sid, mode: 'twilio_live' };
    } catch (error) {
      let advice = '';
      if (error.code === 21608 || error.code === 572002) {
        advice = 'Twilio Trial Account Limitation: You can ONLY send SMS to phone numbers that are verified in your Twilio Console. Add and verify your phone number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified';
      } else if (error.code === 572006) {
        advice = 'Twilio India Trial Restriction: Indian telecom regulations (TRAI/DLT) block arbitrary custom SMS text from Twilio trial accounts without registered DLT templates. Note: Twilio Verify OTP (sendOtpSms) works directly on trial accounts without custom templates!';
      } else if (error.code === 20003) {
        advice = 'Authentication failed. Please verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend/.env.';
      } else if (error.code === 21408) {
        advice = 'Permission to send SMS to this country code is disabled. Enable it in Twilio Geo Permissions (Console -> Messaging -> Settings -> Geo Permissions).';
      } else if (error.code === 21606 || error.code === 21212) {
        advice = 'The From phone number is invalid or not SMS-capable on your Twilio account.';
      }

      console.error(`[SMS Service: Twilio Error ${error.code || ''}] Failed to send SMS to ${formattedTo}: ${error.message}`);
      if (advice) console.error(`[SMS Service Troubleshooting]: ${advice}`);

      return {
        success: false,
        error: error.message,
        code: error.code,
        advice,
        mode: 'twilio_error',
      };
    }
  } else {
    // Sandbox / Test simulation mode
    console.log('====================================================');
    console.log('[SMS Service: Sandbox Simulation Mode]');
    console.log(`To:        ${formattedTo}`);
    console.log(`From:      ${fromNumber} (HMS Mock Gateway)`);
    console.log(`Message:   "${message}"`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('Notice:    To send real SMS to phones, configure Twilio credentials in backend/.env');
    console.log('====================================================');

    return {
      success: true,
      messageId: `SANDBOX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      mode: 'sandbox',
    };
  }
};

/**
 * Send Patient Registration Welcome SMS
 */
const sendPatientRegistrationSms = async ({ phone, patientId, hospitalName = 'Metro General Apex Hospital' }) => {
  const message = `Welcome to ${hospitalName}. Your Patient ID is ${patientId}. Save this ID — you'll need it to log in.`;
  return await sendSms({ to: phone, message });
};

/**
 * Send Doctor Appointment Booking Notification SMS
 */
const sendDoctorAppointmentSms = async ({ doctorPhone, doctorName, patientName, date, timeSlot }) => {
  const greeting = doctorName ? `Dr. ${doctorName}` : 'Doctor';
  const message = `PulseCare Alert: Hello ${greeting}, a new appointment has been booked by ${patientName} on ${date} at ${timeSlot}.`;
  return await sendSms({ to: doctorPhone, message });
};

/**
 * Send Official Twilio Verify OTP via SMS (Supported on India +91 Trial accounts)
 */
const sendOtpSms = async ({ phone }) => {
  const formattedTo = formatPhoneNumber(phone);
  const client = getTwilioClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (client && serviceSid) {
    try {
      const verification = await client.verify.v2.services(serviceSid).verifications.create({
        to: formattedTo,
        channel: 'sms',
      });
      console.log(`[SMS Service: Live Twilio Verify] OTP sent to ${formattedTo} (Status: ${verification.status})`);
      return { success: true, status: verification.status, sid: verification.sid, mode: 'twilio_verify' };
    } catch (err) {
      console.error(`[SMS Service: Verify OTP Error]: ${err.message}`);
      return { success: false, error: err.message, code: err.code, mode: 'twilio_verify_error' };
    }
  }

  // Simulation mode
  const mockCode = Math.floor(100000 + Math.random() * 900000);
  console.log(`[SMS Service: Sandbox OTP] Simulated OTP ${mockCode} sent to ${formattedTo}`);
  return { success: true, status: 'approved', code: mockCode, mode: 'sandbox_otp' };
};

/**
 * Check/Verify an OTP Code
 */
const verifyOtpCode = async ({ phone, code }) => {
  const formattedTo = formatPhoneNumber(phone);
  const client = getTwilioClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (client && serviceSid) {
    try {
      const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
        to: formattedTo,
        code: String(code).trim(),
      });
      return { success: check.status === 'approved', status: check.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: true, status: 'approved' };
};

module.exports = {
  sendSms,
  sendPatientRegistrationSms,
  sendDoctorAppointmentSms,
  sendOtpSms,
  verifyOtpCode,
  formatPhoneNumber,
  getSmsConfigStatus,
};
