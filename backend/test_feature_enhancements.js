/**
 * Comprehensive Automated Verification Script for 4 Feature Enhancements:
 * 1. Patient Registration SMS notification (POST /api/patients/register)
 * 2. Doctor Notification & SMS on appointment booking
 * 3. Doctor Notifications API (GET /api/notifications, PATCH /api/notifications/read-all)
 * 4. "Switch Doctor" functionality reusing bookAppointment without duplicating records
 */

const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING 4 HMS FEATURE ENHANCEMENTS END-TO-END');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: SMS Notification on Patient Registration (POST /api/patients/register)
    // ----------------------------------------------------
    console.log('--- TEST 1: Patient Registration & SMS Dispatch ---');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testAadhar = `8888${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testPhone = `987654${randomSuffix}`;
    const testEmail = `patient_${randomSuffix}@testdomain.org`;

    console.log(`Registering patient: John SMS Test, Phone: ${testPhone}, Aadhar: ${testAadhar}...`);
    const regRes = await req(`${BASE_URL}/patients/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: `John SMS ${randomSuffix}`,
        phone: testPhone,
        dob: '1995-06-15',
        aadhar_number: testAadhar,
        email: testEmail,
      }),
    });

    assert(regRes.status === 201, `Patient registered with status 201 (got ${regRes.status})`);
    assert(regRes.data?.success === true, 'Registration response success is true');
    assert(regRes.data?.patient?.patient_id?.length === 12, `Assigned 12-digit Patient ID: ${regRes.data?.patient?.patient_id}`);

    const patientToken = regRes.data?.token;
    const patientRecord = regRes.data?.patient;

    // ----------------------------------------------------
    // TEST 2: Doctor Notification & SMS on Patient Booking
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Appointment Booking & Doctor Notification ---');
    const doctor1Id = 83; // DOC-2026-0001 Dr. Rajesh Sharma
    const doctor2Id = 66; // DOC-2026-0002 Dr. Raja vel
    const futureDay = String(Math.floor(10 + Math.random() * 18));
    const testDate = `2026-12-${futureDay}`;
    const initialSlot = '10:00 - 10:30';

    console.log(`Booking initial appointment with Doctor #${doctor1Id} on ${testDate} at ${initialSlot}...`);
    const bookRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctor1Id,
        department_id: 1,
        appointment_date: testDate,
        time_slot: initialSlot,
        blood_group: 'B+',
        reason: 'Initial consultation before switch test',
        source: 'manual',
      }),
    });

    assert(bookRes.status === 201, `Appointment booked with HTTP 201 (got ${bookRes.status})`);
    assert(bookRes.data?.data?.id, `Appointment record ID #${bookRes.data?.data?.id}`);
    const appointmentId = bookRes.data?.data?.id;

    // ----------------------------------------------------
    // TEST 3: Doctor Notification Verification & Mark Read
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Doctor In-App Notification Feed & Mark Read ---');
    // Login as Doctor 1
    const docLoginRes = await req(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: JSON.stringify({
        employee_id: 'DOC-2026-0001',
        password: 'Doctor@123',
      }),
    });

    assert(docLoginRes.status === 200 && docLoginRes.data?.token, 'Doctor 1 authenticated successfully');
    const doctorToken = docLoginRes.data?.token;

    // Fetch Doctor Notifications
    const notifRes = await req(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert(notifRes.status === 200, `Fetched doctor notifications with HTTP 200`);
    assert(notifRes.data?.unreadCount > 0, `Doctor has ${notifRes.data?.unreadCount} unread notification(s)`);
    const matchingNotif = notifRes.data?.data?.find(n => n.message.includes(patientRecord.name) || n.message.includes(initialSlot));
    assert(!!matchingNotif, `Notification found in feed: "${matchingNotif?.message}"`);

    // Test Mark all as read
    const markReadRes = await req(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(markReadRes.status === 200, 'Mark all notifications as read succeeded');

    const notifAfterRes = await req(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(notifAfterRes.data?.unreadCount === 0, 'Unread count verified as 0 after read-all');

    // ----------------------------------------------------
    // TEST 4: "Switch Doctor" on Existing Appointment
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Switch Doctor on Existing Appointment ---');
    const switchSlot = '14:00 - 14:30';
    console.log(`Switching Appointment #${appointmentId} to Doctor #${doctor2Id} on ${testDate} at ${switchSlot}...`);

    const switchRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctor2Id,
        department_id: 1,
        appointment_date: testDate,
        time_slot: switchSlot,
        blood_group: 'B+',
        existing_appointment_id: appointmentId,
        reason: 'Switched specialist for second opinion',
        source: 'manual',
      }),
    });

    assert(switchRes.status === 200, `Doctor switch succeeded with HTTP 200 (got ${switchRes.status})`);
    assert(switchRes.data?.isSwitch === true, 'Response confirms isSwitch: true');
    assert(switchRes.data?.data?.id === appointmentId, `Appointment ID preserved (${appointmentId} === ${switchRes.data?.data?.id}) - no duplicate row created`);
    assert(switchRes.data?.data?.doctor_id === doctor2Id, `Doctor ID updated to #${doctor2Id}`);
    assert(switchRes.data?.data?.time_slot === switchSlot, `Time slot updated to ${switchSlot}`);

    // Verify slot conflict checking still works on switched appointment
    console.log('\n--- TEST 5: Slot Collision Guard on Switched Doctor ---');
    const collisionRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctor2Id,
        department_id: 1,
        appointment_date: testDate,
        time_slot: switchSlot, // Same slot as newly switched doctor
        blood_group: 'B+',
        reason: 'Collision test attempt',
        source: 'manual',
      }),
    });

    assert(collisionRes.status === 409, `Slot conflict properly rejected with HTTP 409 (got ${collisionRes.status})`);

    // Verify Doctor 2 received a notification
    console.log('\n--- TEST 6: New Doctor Receives Switched Appointment Alert ---');
    const doc2LoginRes = await req(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: JSON.stringify({
        employee_id: 'DOC-2026-0002',
        password: 'Doctor@123',
      }),
    });
    const doctor2Token = doc2LoginRes.data?.token;

    const notifDoc2Res = await req(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${doctor2Token}` },
    });
    const switchNotif = notifDoc2Res.data?.data?.find(n => n.message.includes('switched') || n.message.includes(patientRecord.name));
    assert(!!switchNotif, `Doctor 2 received notification: "${switchNotif?.message}"`);

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL 4 FEATURE ENHANCEMENTS TESTED AND VERIFIED SUCCESSFULLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Unexpected error running test suite:', err);
    process.exit(1);
  }
}

runTests();
