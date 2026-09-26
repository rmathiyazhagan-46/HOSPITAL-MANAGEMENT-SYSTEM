const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING APPOINTMENT WORKFLOW & CONCURRENCY CONFLICT TEST');
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
    // 1. Patient Login
    console.log('1. Authenticating Patient (PRAVEEN A)...');
    const doctorId = 66;
    const patientLoginRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06'
      })
    });
    const patientLoginData = await patientLoginRes.json();
    const patientToken = patientLoginData.token;
    assert(patientLoginRes.status === 200 && !!patientToken, `Patient login successful with JWT (${patientLoginData.patient?.name})`);

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    };

    // 2. Fetch Available Slots for Doctor on an idempotent future date
    const randomDay = String(Math.floor(10 + Math.random() * 18));
    const testDate = `2027-02-${randomDay}`;
    console.log(`\n2. Fetching Available Slots for Doctor ${doctorId} on future date (${testDate})...`);
    const slotsRes = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${testDate}`);
    const slotsData = await slotsRes.json();
    assert(slotsRes.status === 200 && Array.isArray(slotsData.data?.allSlots), 'Fetched slots list successfully');
    assert(slotsData.data?.allSlots?.length > 0, `Returned ${slotsData.data?.allSlots?.length} configured slots`);

    const slotToBook = slotsData.data?.availableSlots?.[0] || '10:30 - 11:00';

    // 3. Book Appointment
    console.log(`\n3. Booking slot "${slotToBook}" on ${testDate}...`);
    const bookRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: testDate,
        time_slot: slotToBook,
        blood_group: 'B+',
        reason: 'Automated test consultation for routine cardiovascular assessment',
        source: 'manual'
      })
    });
    const bookData = await bookRes.json();

    assert(bookRes.status === 201 && bookData.data?.id, `Appointment created successfully with ID #${bookData.data?.id}`);
    const appointmentId = bookData.data?.id;

    // 4. Concurrency / Duplicate Conflict Check (same doctor, same date, same slot)
    console.log(`\n4. Attempting duplicate collision booking for slot "${slotToBook}" on ${testDate} (Expect HTTP 409 Conflict)...`);
    const conflictRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: testDate,
        time_slot: slotToBook,
        blood_group: 'B+',
        reason: 'Duplicate slot collision attempt',
        source: 'manual'
      })
    });
    const conflictData = await conflictRes.json();

    assert(
      conflictRes.status === 409,
      `Duplicate booking rejected with HTTP 409 Conflict: "${conflictData.message}"`
    );

    // 5. Verify Slot is now marked as booked
    console.log('\n5. Verifying slot availability endpoint reflects booked slot...');
    const slotsResAfter = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${testDate}`);
    const slotsDataAfter = await slotsResAfter.json();
    const isNowBooked = slotsDataAfter.data?.bookedSlots?.includes(slotToBook);
    assert(isNowBooked, `Slot "${slotToBook}" is now present in bookedSlots array`);

    // 6. Download Confirmation PDF Slip
    console.log(`\n6. Downloading Appointment Confirmation PDF Slip for #${appointmentId}...`);
    const pdfRes = await fetch(`${BASE_URL}/appointments/${appointmentId}/confirmation-pdf`, {
      headers: {
        'Authorization': `Bearer ${patientToken}`
      }
    });

    const isPdf = pdfRes.headers.get('content-type') === 'application/pdf';
    const pdfBuffer = await pdfRes.arrayBuffer();
    const hasData = pdfBuffer.byteLength > 500;
    assert(pdfRes.status === 200 && isPdf && hasData, `Confirmation PDF generated & downloaded successfully (${pdfBuffer.byteLength} bytes)`);

  } catch (err) {
    console.error('Test execution error:', err.message);
    failed++;
  }

  console.log(`\n====================================================`);
  console.log(`APPOINTMENT TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runTests();
