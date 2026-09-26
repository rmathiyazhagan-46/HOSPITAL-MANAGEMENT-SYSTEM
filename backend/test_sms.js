/**
 * SMS Diagnostic & Testing Script
 *
 * Usage:
 *   node test_sms.js                      (checks config and sends a sandbox or live test)
 *   node test_sms.js 9876543210           (sends test SMS to specified phone number)
 *   node test_sms.js +919876543210        (with international prefix)
 */

require('dotenv').config();
const { sendSms, getSmsConfigStatus, formatPhoneNumber } = require('./utils/smsService');

async function run() {
  console.log('====================================================');
  console.log('📱 PULSECARE HMS: SMS SERVICE DIAGNOSTICS');
  console.log('====================================================\n');

  const config = getSmsConfigStatus();

  console.log('🔍 CURRENT ENVIRONMENT CONFIGURATION:');
  console.log(`  • TWILIO_ACCOUNT_SID: ${config.accountSidMasked}`);
  console.log(`  • TWILIO_AUTH_TOKEN:  ${config.hasAuthToken ? '****** (Configured)' : 'Not set / Placeholder'}`);
  console.log(`  • TWILIO_PHONE_NUMBER: ${config.phoneNumber}`);
  console.log(`  • ACTIVE OPERATION MODE: ${config.mode.toUpperCase()}`);
  console.log(`  • STATUS: ${config.isConfigured ? '🟢 LIVE (Real SMS)' : '🟡 SANDBOX / MOCK (Console only)'}\n`);

  // Target phone number from CLI argument or fallback
  const targetPhone = process.argv[2] || '7845751246';
  const modeArg = process.argv[3] || 'otp';
  const formattedPhone = formatPhoneNumber(targetPhone);

  console.log(`🚀 INITIATING TEST DISPATCH TO: ${formattedPhone} (Mode: ${modeArg.toUpperCase()})`);
  console.log('----------------------------------------------------');

  let result;
  if (modeArg.toLowerCase() === 'otp') {
    const { sendOtpSms } = require('./utils/smsService');
    result = await sendOtpSms({ phone: targetPhone });
  } else {
    result = await sendSms({
      to: targetPhone,
      message: `PulseCare HMS Verification Alert: SMS service is active and responsive. Timestamp: ${new Date().toLocaleTimeString()}.`,
    });
  }

  console.log('----------------------------------------------------');
  console.log('📊 DISPATCH RESULT:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success && (result.mode === 'twilio_live' || result.mode === 'twilio_verify')) {
    console.log('\n🎉 SUCCESS! Real OTP / SMS was successfully dispatched via Twilio to your phone.');
    console.log(`   Twilio SID: ${result.messageId || result.sid}`);
  } else if (result.success && (result.mode === 'sandbox' || result.mode === 'sandbox_otp')) {
    console.log('\n⚠️  SANDBOX MODE NOTICE:');
    console.log('   The system simulated sending the SMS and printed the payload above.');
    console.log('   No real SMS was delivered to the mobile carrier because Twilio credentials');
    console.log('   in backend/.env are currently unset or placeholders.\n');
    console.log('📋 TO SEND REAL SMS TO YOUR PHONE:');
    console.log('   1. Sign up for a free Twilio account at: https://www.twilio.com/try-twilio');
    console.log('   2. Obtain your free Account SID, Auth Token, and Twilio Phone Number.');
    console.log('   3. Open "backend/.env" and replace the placeholders:');
    console.log('      TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    console.log('      TWILIO_AUTH_TOKEN=your_32_character_auth_token');
    console.log('      TWILIO_PHONE_NUMBER=+1XXXXXXXXXX');
    console.log('   4. (Important for Free Trial Accounts): Verify your mobile number');
    console.log('      under Twilio Console -> Phone Numbers -> Verified Caller IDs:');
    console.log('      https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log(`   5. Run this test again: node test_sms.js ${targetPhone}`);
  } else {
    console.log('\n❌ TWILIO DISPATCH ERROR:');
    console.log(`   Error: ${result.error}`);
    if (result.advice) {
      console.log(`   Advice: ${result.advice}`);
    }
  }

  console.log('\n====================================================');
}

run().catch(console.error);
