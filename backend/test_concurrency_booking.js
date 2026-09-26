const BASE_URL = 'http://localhost:5000/api';

async function runConcurrencyTests() {
  console.log('================================================================');
  console.log('STARTING RELIABLE APPOINTMENT CONCURRENCY & CANCELLATION TESTS');
  console.log('================================================================\n');

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
    // 1. Authenticate two distinct patients
    console.log('1. Authenticating Patient 1 (PRAVEEN A) & Patient 2 (Jane Doe)...');
    const doctor1Id = 66;
    const doctor2Id = 68;

    const p1Res = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06'
      })
    });
    const p1Data = await p1Res.json();
    const token1 = p1Data.token;
    assert(p1Res.status === 200 && !!token1, `Patient 1 logged in (${p1Data.patient?.name})`);

    const p2Res = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: '993981341596',
        name: 'Jane Doe',
        dob: '1995-05-15'
      })
    });
    const p2Data = await p2Res.json();
    const token2 = p2Data.token;
    assert(p2Res.status === 200 && !!token2, `Patient 2 logged in (${p2Data.patient?.name})`);

    const headersP1 = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` };
    const headersP2 = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` };

    // 2. CONCURRENT DOUBLE-BOOKING COLLISION TEST
    // Generate a unique future date for testing
    const futureDate = `2027-11-${String(Math.floor(10 + Math.random() * 18)).padStart(2, '0')}`;
    const testSlot = '10:00 - 10:30';
    console.log(`\n2. Simultaneous Concurrency Test: 2 patients attempting to book Doctor ${doctor1Id} on ${futureDate} at ${testSlot} at the exact same moment...`);

    const [booking1, booking2] = await Promise.all([
      fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: headersP1,
        body: JSON.stringify({
          doctor_id: doctor1Id,
          appointment_date: futureDate,
          time_slot: testSlot,
          blood_group: 'O+',
          reason: 'Patient 1 cardiovascular checkup',
          source: 'manual',
        })
      }),
      fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: headersP2,
        body: JSON.stringify({
          doctor_id: doctor1Id,
          appointment_date: futureDate,
          time_slot: testSlot,
          blood_group: 'O+',
          reason: 'Patient 2 general consultation',
          source: 'manual',
        })
      })
    ]);

    const res1 = await booking1.json();
    const res2 = await booking2.json();

    const statuses = [booking1.status, booking2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      `Exactly one booking succeeded (201) and the collision was cleanly rejected (409). [Status 1: ${booking1.status}, Status 2: ${booking2.status}]`
    );

    const winnerRes = booking1.status === 201 ? res1 : res2;
    const loserRes = booking1.status === 409 ? res1 : res2;
    const winnerHeaders = booking1.status === 201 ? headersP1 : headersP2;
    const loserHeaders = booking1.status === 409 ? headersP1 : headersP2;

    assert(
      loserRes.message.includes('Slot Unavailable') || loserRes.message.includes('already booked'),
      `Collision rejected with clear error: "${loserRes.message}"`
    );

    const activeApptId = winnerRes.data?.id;
    assert(!!activeApptId, `Winner appointment created successfully with ID #${activeApptId}`);

    // 3. DOCTOR-SPECIFIC AVAILABILITY TEST
    console.log(`\n3. Doctor-Specific Availability Test: Booking Doctor ${doctor2Id} on same date (${futureDate}) and same slot (${testSlot})...`);
    const doc2Booking = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: loserHeaders,
      body: JSON.stringify({
        doctor_id: doctor2Id,
        appointment_date: futureDate,
        time_slot: testSlot,
        blood_group: 'O+',
        reason: 'Doctor 2 consultation on identical slot',
        source: 'manual',
      })
    });
    const doc2Data = await doc2Booking.json();
    assert(
      doc2Booking.status === 201 && !!doc2Data.data?.id,
      `Doctor 2 booked successfully on the same slot (${testSlot}) — confirms slot availability is scoped per doctor`
    );

    // 4. PAST SLOTS BLOCKED TEST
    console.log('\n4. Past Slots Blocked Test: Attempting to book in 2020-01-01...');
    const pastBooking = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: headersP1,
      body: JSON.stringify({
        doctor_id: doctor1Id,
        appointment_date: '2020-01-01',
        time_slot: '10:00 - 10:30',
        blood_group: 'O+',
        reason: 'Attempted past booking',
        source: 'manual',
      })
    });
    const pastData = await pastBooking.json();
    assert(
      pastBooking.status === 400 && pastData.message.includes('past date'),
      `Past booking rejected with HTTP 400 Bad Request: "${pastData.message}"`
    );

    // 5. SLOT STATUS DISPLAY (4 DISTINCT STATES) TEST
    console.log(`\n5. Verifying slot status scoping on ${futureDate} for Doctor ${doctor1Id}...`);
    // Query with Winner patient auth
    const slotsWinnerRes = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctor1Id}&date=${futureDate}`, {
      headers: winnerHeaders
    });
    const slotsWinnerData = await slotsWinnerRes.json();
    const winnerSlot = slotsWinnerData.data?.grouped?.morning?.find(s => s.slot === testSlot);
    assert(
      winnerSlot && winnerSlot.isMyAppointment && winnerSlot.state === 'my_appointment',
      `Winner sees slot "${testSlot}" distinctly as "my_appointment" (Your Appointment)`
    );

    // Query with Loser patient auth
    const slotsLoserRes = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctor1Id}&date=${futureDate}`, {
      headers: loserHeaders
    });
    const slotsLoserData = await slotsLoserRes.json();
    const loserSlot = slotsLoserData.data?.grouped?.morning?.find(s => s.slot === testSlot);
    assert(
      loserSlot && loserSlot.isBooked && loserSlot.state === 'booked',
      `Loser sees slot "${testSlot}" as "booked" (taken by another patient)`
    );

    // 6. CANCELLATION FLOW & IMMEDIATE SLOT RELEASE TEST
    console.log(`\n6. Cancellation Security & Execution Test for #${activeApptId}...`);
    // Unauthorized cancellation attempt (loser attempts to cancel winner's appointment)
    const unauthCancel = await fetch(`${BASE_URL}/appointments/${activeApptId}/cancel`, {
      method: 'POST',
      headers: loserHeaders,
    });
    const unauthCancelData = await unauthCancel.json();
    assert(
      unauthCancel.status === 403,
      `Unauthorized cancellation rejected with HTTP 403 Forbidden: "${unauthCancelData.message}"`
    );

    // Authorized cancellation by appointment owner
    const authCancel = await fetch(`${BASE_URL}/appointments/${activeApptId}/cancel`, {
      method: 'POST',
      headers: winnerHeaders,
    });
    const authCancelData = await authCancel.json();
    assert(
      authCancel.status === 200 && authCancelData.data?.status === 'cancelled',
      `Appointment cancelled successfully: "${authCancelData.message}"`
    );

    // Verify slot is now immediately available
    console.log(`\nVerifying slot "${testSlot}" is immediately released...`);
    const slotsAfterCancel = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctor1Id}&date=${futureDate}`);
    const slotsAfterCancelData = await slotsAfterCancel.json();
    assert(
      slotsAfterCancelData.data?.availableSlots?.includes(testSlot),
      `Slot "${testSlot}" is immediately available again for other patients`
    );

    // Rebook the freed slot by the other patient
    console.log(`\nRebooking freed slot "${testSlot}" by the other patient...`);
    const rebook = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: loserHeaders,
      body: JSON.stringify({
        doctor_id: doctor1Id,
        appointment_date: futureDate,
        time_slot: testSlot,
        blood_group: 'O+',
        reason: 'Booking previously released slot',
        source: 'manual',
      })
    });
    const rebookData = await rebook.json();
    assert(
      rebook.status === 201 && !!rebookData.data?.id,
      `Freed slot rebooked successfully by another patient with ID #${rebookData.data?.id}`
    );

    // 7. ATOMIC RESCHEDULE FLOW TEST
    const rebookedId = rebookData.data?.id;
    const newSlot = '14:00 - 14:30';
    console.log(`\n7. Reschedule Test: Rescheduling appointment #${rebookedId} to ${newSlot}...`);
    const reschedule = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: loserHeaders,
      body: JSON.stringify({
        existing_appointment_id: rebookedId,
        doctor_id: doctor1Id,
        appointment_date: futureDate,
        time_slot: newSlot,
        blood_group: 'O+',
        reason: 'Rescheduled appointment',
        source: 'manual',
      })
    });
    const rescheduleData = await reschedule.json();
    assert(
      reschedule.status === 200 && rescheduleData.data?.time_slot === newSlot,
      `Appointment rescheduled successfully to ${newSlot}`
    );

    // Check that the old slot is now freed
    const slotsAfterReschedule = await fetch(`${BASE_URL}/appointments/available-slots?doctor_id=${doctor1Id}&date=${futureDate}`);
    const slotsAfterRescheduleData = await slotsAfterReschedule.json();
    assert(
      slotsAfterRescheduleData.data?.availableSlots?.includes(testSlot),
      `Old slot "${testSlot}" is released and available after reschedule`
    );
    assert(
      slotsAfterRescheduleData.data?.bookedSlots?.includes(newSlot),
      `New slot "${newSlot}" is now booked`
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n================================================================`);
  console.log(`CONCURRENCY TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

runConcurrencyTests();
