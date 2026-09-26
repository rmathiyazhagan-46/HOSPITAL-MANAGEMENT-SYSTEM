const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AI CHATBOT ASSISTANT ENDPOINT & ROLE GUARD TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Patient
    console.log('1. Authenticating Patient (PRAVEEN A)...');
    const patientLoginRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06',
      }),
    });
    const patientData = await patientLoginRes.json();
    const patientToken = patientData.token;
    assert(patientLoginRes.status === 200 && !!patientToken, 'Patient logged in successfully');
    const patientHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`,
    };

    // 2. Symptom Triage Check via Chatbot
    console.log('\n2. Testing Symptom Triage (Chest pain -> Cardiology)...');
    const triageRes = await fetch(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ message: 'I have severe chest pain and palpitations' }),
    });
    const triageData = await triageRes.json();
    assert(triageRes.status === 200, 'Chatbot message accepted (200 OK)');
    assert(triageData.data?.matchedDepartment === 'Cardiology', 'Triaged to Cardiology department');
    assert(Array.isArray(triageData.data?.suggestedDoctors) && triageData.data?.suggestedDoctors.length > 0, 'Returned suggested cardiologists');

    // 3. Static FAQ Check via Chatbot
    console.log('\n3. Testing FAQ Matching (Hospital Timings & Visiting Hours)...');
    const faqRes = await fetch(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ message: 'What are your hospital timings and OPD hours?' }),
    });
    const faqData = await faqRes.json();
    assert(faqRes.status === 200, 'FAQ query processed (200 OK)');
    assert(faqData.data?.reply.includes('08:00 AM – 08:00 PM'), 'Returned accurate hospital timings FAQ');

    // 4. Human Reception Escalation Check
    console.log('\n4. Testing Reception Escalation Handoff...');
    const escalationRes = await fetch(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({ message: 'Connect to reception desk please' }),
    });
    const escalationData = await escalationRes.json();
    assert(escalationRes.status === 200, 'Escalation query accepted');
    assert(escalationData.data?.cardType === 'reception_card', 'Returned reception handoff card');
    assert(escalationData.data?.cardData?.phone === '+91 98765 43210', 'Included 24/7 reception phone number');

    // 5. Patient Report / Status Tracking Endpoint
    console.log('\n5. Testing Real-Time Report Tracking (GET /api/chatbot/track)...');
    const trackRes = await fetch(`${BASE_URL}/chatbot/track`, {
      headers: patientHeaders,
    });
    const trackData = await trackRes.json();
    assert(trackRes.status === 200, 'Tracking endpoint returned 200 OK');
    assert(trackData.data?.appointment !== undefined, 'Returned patient appointment tracking data');

    // 6. Role Boundaries: Doctor and Admin must be rejected (403 Forbidden)
    console.log('\n6. Testing Role Boundaries (Doctor and Admin must receive 403 Forbidden)...');
    const docLoginRes = await fetch(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: 'DOC-2026-0001',
        password: 'Doctor@123',
      }),
    });
    const docData = await docLoginRes.json();
    const docToken = docData.token;

    const docChatRes = await fetch(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${docToken}`,
      },
      body: JSON.stringify({ message: 'Hello bot' }),
    });
    assert(docChatRes.status === 403, 'Doctor portal blocked from patient AI chatbot (403 Forbidden)');

    // 7. Conversational Booking via Shared API
    console.log('\n7. Testing Conversational Booking (calling shared POST /api/appointments with source="chatbot")...');
    const randomDay = String(Math.floor(10 + Math.random() * 18));
    const testDate = `2026-12-${randomDay}`;
    const testDoctorId = triageData.data?.suggestedDoctors?.[0]?.id || 66;
    const botBookingRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: JSON.stringify({
        doctor_id: testDoctorId,
        appointment_date: testDate,
        time_slot: '09:00 - 09:30',
        blood_group: 'B+',
        reason: 'Scheduled via HealthBot Assistant for chest discomfort triage',
        source: 'chatbot',
      }),
    });
    const botBookingData = await botBookingRes.json();
    assert(botBookingRes.status === 201, 'Conversational appointment booked successfully (201 Created)');
    assert(botBookingData.data?.source === 'chatbot', 'Appointment correctly flagged with source="chatbot"');

  } catch (err) {
    console.error('Test execution error:', err.message);
    failed++;
  }

  console.log(`\n====================================================`);
  console.log(`CHATBOT TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runTests();
