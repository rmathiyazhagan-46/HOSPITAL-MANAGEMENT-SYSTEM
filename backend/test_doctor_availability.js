const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function runAvailabilityTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING DOCTOR AVAILABILITY CALENDAR TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Doctor, Admin, and Patient
    console.log('1. Authenticating Roles...');
    const docLogin = await req(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: { employee_id: 'DOC-2026-0002', password: 'Doctor@123' },
    });
    assert(docLogin.status === 200 && docLogin.data?.token, 'Doctor authenticated');
    const doctorToken = docLogin.data.token;
    const doctorId = docLogin.data.doctor.id;

    const adminLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: {
        hospital_name: 'Metro General Apex Hospital',
        email: 'admin@hospital.org',
        password: 'admin123',
      },
    });
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin authenticated');
    const adminToken = adminLogin.data.token;

    const patientLogin = await req(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      body: {
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06',
      },
    });
    assert(patientLogin.status === 200 && patientLogin.data?.token, 'Patient authenticated');
    const patientToken = patientLogin.data.token;

    // Pick unique future test dates
    const testDateFullDay = '2026-11-20';
    const testDateSlot = '2026-11-21';
    const targetSlot = '14:00 - 14:30';

    // 2. Doctor sets a full day as unavailable (Leave/Holiday)
    console.log('\n2. Doctor marking full day unavailable...');
    const fullDayRes = await req(`${BASE_URL}/doctors/${doctorId}/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        date: testDateFullDay,
        time_slot: null,
        reason: 'Attending Medical Cardiology Summit',
      },
    });
    assert(fullDayRes.status === 201, `Full day leave recorded (HTTP 201)`, JSON.stringify(fullDayRes.data));
    assert(fullDayRes.data?.data?.date === testDateFullDay, 'Leave date matches');
    assert(fullDayRes.data?.data?.time_slot === null, 'Full day scope verified (time_slot is null)');
    const fullDayEntryId = fullDayRes.data?.data?.id;

    // 3. Doctor sets a specific time slot as unavailable
    console.log('\n3. Doctor marking specific time slot unavailable...');
    const slotRes = await req(`${BASE_URL}/doctors/${doctorId}/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        date: testDateSlot,
        time_slot: targetSlot,
        reason: 'Department Clinical Meeting',
      },
    });
    assert(slotRes.status === 201, `Specific slot unavailability recorded (HTTP 201)`);
    assert(slotRes.data?.data?.time_slot === targetSlot, 'Slot string matches');
    const slotEntryId = slotRes.data?.data?.id;

    // 4. Role Authorization: Doctor attempting to edit Doctor 999 availability
    console.log('\n4. Testing Doctor Cross-Account RBAC Protection...');
    const unauthorizedRes = await req(`${BASE_URL}/doctors/999/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        date: '2026-11-22',
        time_slot: null,
      },
    });
    assert(unauthorizedRes.status === 403, 'Cross-doctor modification rejected with HTTP 403 Forbidden');

    // 5. Admin Override: Admin managing availability for Doctor
    console.log('\n5. Testing Admin Override on behalf of Doctor...');
    const adminDate = '2026-11-23';
    const adminRes = await req(`${BASE_URL}/doctors/${doctorId}/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        date: adminDate,
        time_slot: null,
        reason: 'Admin Mandated Departmental Training',
      },
    });
    assert(adminRes.status === 201, 'Admin successfully added doctor availability override (HTTP 201)');
    const adminEntryId = adminRes.data?.data?.id;

    // 5b. Recurring weekly day off (e.g. Every Sunday)
    console.log('\n5b. Testing Recurring Weekly Day Off (Sundays)...');
    const recurringRes = await req(`${BASE_URL}/doctors/${doctorId}/availability`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        date: '2026-11-22', // A Sunday
        time_slot: null,
        is_recurring: true,
        recurring_day_of_week: 0,
        reason: 'Weekly Sunday Off',
      },
    });
    assert(recurringRes.status === 201, 'Recurring Sunday off created (HTTP 201)');
    const recurringEntryId = recurringRes.data?.data?.id;

    // 6. List Doctor Availabilities
    console.log('\n6. Fetching Doctor Availabilities list...');
    const listRes = await req(`${BASE_URL}/doctors/${doctorId}/availability`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(listRes.status === 200, 'Fetched doctor availabilities (HTTP 200)');
    assert(Array.isArray(listRes.data?.data) && listRes.data.data.length >= 3, 'Contains recorded availability entries');

    // 7. Verify Slot Availability API reflects doctor unavailabilities
    console.log('\n7. Verifying Slot Availability API...');
    // 7a. Full day unavailable
    const checkFullDay = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${testDateFullDay}`);
    assert(checkFullDay.status === 200, 'Slot query for full-day off returned HTTP 200');
    assert(checkFullDay.data?.data?.isDayUnavailable === true, 'isDayUnavailable is true for full-day leave');
    assert(checkFullDay.data?.data?.availableSlots?.length === 0, 'availableSlots is empty on full-day leave');

    // 7b. Specific slot unavailable
    const checkSlot = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${testDateSlot}`);
    assert(checkSlot.status === 200, 'Slot query for partial day returned HTTP 200');
    assert(checkSlot.data?.data?.unavailableSlots?.includes(targetSlot), `unavailableSlots includes "${targetSlot}"`);
    assert(!checkSlot.data?.data?.availableSlots?.includes(targetSlot), `availableSlots excludes "${targetSlot}"`);

    // 8. Backend Booking Conflict Rejection
    console.log('\n8. Verifying Backend Strict Conflict Prevention for Unavailable Slots...');
    // 8a. Attempt booking on full-day unavailable date
    const bookFullDayAttempt = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        doctor_id: doctorId,
        appointment_date: testDateFullDay,
        time_slot: '10:00 - 10:30',
        blood_group: 'O+',
        reason: 'Routine checkup attempt on leave day',
      },
    });
    console.log(bookFullDayAttempt); assert(bookFullDayAttempt.status === 409, 'Booking attempt on doctor full-day leave rejected with HTTP 409 Conflict');
    assert(bookFullDayAttempt.data?.message?.toLowerCase().includes('unavailable'), 'Returns standard doctor availability conflict message');

    // 8b. Attempt booking on specifically marked unavailable slot
    const bookSlotAttempt = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        doctor_id: doctorId,
        appointment_date: testDateSlot,
        time_slot: targetSlot,
        blood_group: 'O+',
        reason: 'Routine checkup attempt on unavailable slot',
      },
    });
    assert(bookSlotAttempt.status === 409, `Booking attempt on unavailable slot "${targetSlot}" rejected with HTTP 409 Conflict`);

    // 8c. Verify Sunday check
    const checkSunday = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=2026-11-22`);
    assert(checkSunday.data?.data?.isDayUnavailable === true, 'Recurring Sunday off correctly marks isDayUnavailable = true');

    // 9. Remove/Undo Unavailability Entry
    console.log('\n9. Removing Unavailability Entry & Verifying Slot Restoration...');
    const deleteRes = await req(`${BASE_URL}/doctors/${doctorId}/availability/${slotEntryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(deleteRes.status === 200, 'Deleted slot unavailability entry (HTTP 200)');

    // Verify slot is immediately restored
    const checkRestored = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${testDateSlot}`);
    assert(checkRestored.data?.data?.availableSlots?.includes(targetSlot), `Slot "${targetSlot}" is restored and available again`);

    // Clean up full-day, admin, and recurring entries
    if (fullDayEntryId) {
      await req(`${BASE_URL}/doctors/${doctorId}/availability/${fullDayEntryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
    }
    if (adminEntryId) {
      await req(`${BASE_URL}/doctors/${doctorId}/availability/${adminEntryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (recurringEntryId) {
      await req(`${BASE_URL}/doctors/${doctorId}/availability/${recurringEntryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
    }
    console.log('  Cleaned up test availability entries.');

  } catch (err) {
    console.error('Fatal Test Error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`AVAILABILITY TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runAvailabilityTests();
