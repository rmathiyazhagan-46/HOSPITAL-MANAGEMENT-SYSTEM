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
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING 3-STAGE APPOINTMENT FLOW & STRICT VALIDATION');
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
    const { Patient } = require('./models');
    await Patient.findOrCreate({
      where: { patient_id: '993957875071' },
      defaults: {
        name: 'PRAVEEN A',
        phone: '9982408311',
        dob: '2007-02-06',
        aadhar_number: '123456789012',
        email: 'praveena622007@gmail.com',
      },
    });

    // 1. Patient Login
    console.log('1️⃣ Authenticating Patient (PRAVEEN A)...');
    const patientLogin = await req(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      body: JSON.stringify({
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06',
      }),
    });
    assert(patientLogin.status === 200 && patientLogin.data?.token, 'Patient login successful');
    const patientToken = patientLogin.data.token;

    // 2. Doctor Login
    console.log('\n2️⃣ Authenticating Doctor (DOC-2026-0002)...');
    const doctorLogin = await req(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: JSON.stringify({
        employee_id: 'DOC-2026-0002',
        password: 'Doctor@123',
      }),
    });
    assert(doctorLogin.status === 200 && doctorLogin.data?.token, 'Doctor login successful');
    const doctorToken = doctorLogin.data.token;
    const doctorId = doctorLogin.data.doctor.id;

    // 3. Admin Login
    console.log('\n3️⃣ Authenticating Admin (admin@hospital.org)...');
    const adminLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@hospital.org',
        password: 'admin123',
      }),
    });
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin login successful');
    const adminToken = adminLogin.data.token;

    // 4. Book New Appointment (Stage 1: Pending)
    const futureDate = '2028-11-20';
    console.log(`\n4️⃣ Booking new appointment for doctor ${doctorId} on ${futureDate}...`);
    const slotsRes = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${futureDate}`);
    const chosenSlot = slotsRes.data?.data?.availableSlots?.[0] || '10:00 - 10:30';

    const bookRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: futureDate,
        time_slot: chosenSlot,
        blood_group: 'O+',
        reason: '3-Stage flow test verification',
        source: 'manual',
      }),
    });

    assert(bookRes.status === 201, `Appointment created (Status: ${bookRes.status})`);
    const appt = bookRes.data?.data || bookRes.data?.appointment;
    const apptId = appt?.id;
    assert(appt?.status === 'pending', `Initial appointment status is 'pending' (actual: '${appt?.status}')`);
    assert(appt?.confirmed_at === null, 'confirmed_at is null at stage 1');
    assert(appt?.completed_at === null, 'completed_at is null at stage 1');
    assert(appt?.consultation_notes === null, 'consultation_notes is null at stage 1');
    assert(appt?.prescription_id === null, 'prescription_id is null at stage 1');

    // 5. Strict Validation: Pending CANNOT jump directly to completed via status update
    console.log('\n5️⃣ Testing strict transition: Attempting pending -> completed via status patch (Expect 400)...');
    const invalidJumpRes = await req(`${BASE_URL}/appointments/${apptId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert(invalidJumpRes.status === 400, `Rejected pending -> completed jump with HTTP ${invalidJumpRes.status}: "${invalidJumpRes.data?.message}"`);

    // 6. Strict Validation: Doctor CANNOT consult on pending appointment
    console.log('\n6️⃣ Testing strict transition: Doctor attempting consultation on pending appointment (Expect 400)...');
    const invalidConsultRes = await req(`${BASE_URL}/doctors/portal/consultation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        appointment_id: apptId,
        patient_id: appt.patient_id,
        diagnosis_notes: 'Premature consultation notes',
        prescription_notes: 'None',
        items: [],
      }),
    });
    assert(invalidConsultRes.status === 400, `Rejected consultation on pending appointment with HTTP ${invalidConsultRes.status}: "${invalidConsultRes.data?.message}"`);

    // 7. Transition Stage 1 -> Stage 2: Confirm Appointment
    console.log(`\n7️⃣ Confirming appointment #${apptId} via Doctor Portal API...`);
    const confirmRes = await req(`${BASE_URL}/appointments/${apptId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(confirmRes.status === 200, `Appointment confirmed (Status: ${confirmRes.status})`);
    const confirmedAppt = confirmRes.data?.data;
    assert(confirmedAppt?.status === 'confirmed', `Status updated to 'confirmed' (actual: '${confirmedAppt?.status}')`);
    assert(!!confirmedAppt?.confirmed_at, `confirmed_at timestamp recorded: ${confirmedAppt?.confirmed_at}`);

    // 8. Idempotency / Duplicate Confirm check
    console.log('\n8️⃣ Testing re-confirmation on already confirmed appointment (Expect 400)...');
    const reConfirmRes = await req(`${BASE_URL}/appointments/${apptId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(reConfirmRes.status === 400, `Rejected re-confirm with HTTP ${reConfirmRes.status}: "${reConfirmRes.data?.message}"`);

    // 9. Transition Stage 2 -> Stage 3: Consult & Prescribe
    console.log('\n9️⃣ Doctor submitting consultation & prescription on confirmed appointment...');
    const medListRes = await req(`${BASE_URL}/pharmacy/medicines`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const sampleMed = medListRes.data?.data?.[0];

    const consultRes = await req(`${BASE_URL}/doctors/portal/consultation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        appointment_id: apptId,
        patient_id: appt.patient_id,
        diagnosis_notes: 'Patient exhibits normal sinus rhythm. Mild seasonal allergies.',
        prescription_notes: 'Drink plenty of water and rest.',
        items: sampleMed ? [
          {
            medicine_id: sampleMed.id,
            quantity: 1,
            dosage: '500mg',
            frequency: 'Morning, Night',
            duration: '3 days',
          }
        ] : [],
      }),
    });

    assert(consultRes.status === 201, `Consultation recorded successfully (Status: ${consultRes.status})`);

    // 10. Verify Appointment has completed_at, consultation_notes, and status === 'completed'
    console.log('\n🔟 Verifying completed appointment record in database...');
    const allApptsRes = await req(`${BASE_URL}/appointments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const savedAppt = allApptsRes.data?.data?.find(a => a.id === apptId);
    assert(savedAppt?.status === 'completed', `Appointment status is 'completed' (actual: '${savedAppt?.status}')`);
    assert(!!savedAppt?.completed_at, `completed_at timestamp recorded: ${savedAppt?.completed_at}`);
    assert(savedAppt?.consultation_notes?.includes('normal sinus rhythm'), `consultation_notes saved: "${savedAppt?.consultation_notes}"`);
    if (sampleMed) {
      assert(!!savedAppt?.prescription_id, `prescription_id saved: #${savedAppt?.prescription_id}`);
    }

    // 11. Strict Rule: Cannot cancel a completed appointment
    console.log('\n1️⃣1️⃣ Attempting to cancel completed appointment (Expect 400)...');
    const cancelCompletedRes = await req(`${BASE_URL}/appointments/${apptId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(cancelCompletedRes.status === 400, `Rejected cancellation of completed appointment with HTTP ${cancelCompletedRes.status}: "${cancelCompletedRes.data?.message}"`);

    // 12. Strict Rule: Cannot re-consult on completed appointment
    console.log('\n1️⃣2️⃣ Attempting second consultation on completed appointment (Expect 400)...');
    const secondConsultRes = await req(`${BASE_URL}/doctors/portal/consultation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        appointment_id: apptId,
        patient_id: appt.patient_id,
        diagnosis_notes: 'Duplicate consultation attempt',
        items: [],
      }),
    });
    assert(secondConsultRes.status === 400, `Rejected second consultation on completed appointment with HTTP ${secondConsultRes.status}: "${secondConsultRes.data?.message}"`);

    // 13. Cancellation from 'pending' state
    console.log('\n1️⃣3️⃣ Testing cancellation from "pending" state...');
    const pendingDate = '2028-11-21';
    const bookPendingRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: pendingDate,
        time_slot: '11:00 - 11:30',
        blood_group: 'B+',
        reason: 'Cancel from pending test',
        source: 'manual',
      }),
    });
    const pendingApptId = bookPendingRes.data?.data?.id || bookPendingRes.data?.appointment?.id;
    assert(bookPendingRes.status === 201 && !!pendingApptId, `Booked pending appointment #${pendingApptId}`);

    const cancelPendingRes = await req(`${BASE_URL}/appointments/${pendingApptId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(cancelPendingRes.status === 200, `Successfully cancelled pending appointment (Status: ${cancelPendingRes.status})`);
    assert(cancelPendingRes.data?.data?.status === 'cancelled', 'Status changed to cancelled');

    // 14. Cancellation from 'confirmed' state
    console.log('\n1️⃣4️⃣ Testing cancellation from "confirmed" state...');
    const confirmedDate = '2028-11-22';
    const bookConfirmedRes = await req(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: confirmedDate,
        time_slot: '11:30 - 12:00',
        blood_group: 'A+',
        reason: 'Cancel from confirmed test',
        source: 'manual',
      }),
    });
    const confApptId = bookConfirmedRes.data?.data?.id || bookConfirmedRes.data?.appointment?.id;
    assert(bookConfirmedRes.status === 201 && !!confApptId, `Booked appointment #${confApptId}`);

    // Confirm it
    const confItRes = await req(`${BASE_URL}/appointments/${confApptId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(confItRes.status === 200 && confItRes.data?.data?.status === 'confirmed', `Confirmed appointment #${confApptId}`);

    // Cancel it
    const cancelConfRes = await req(`${BASE_URL}/appointments/${confApptId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(cancelConfRes.status === 200, `Successfully cancelled confirmed appointment (Status: ${cancelConfRes.status})`);
    assert(cancelConfRes.data?.data?.status === 'cancelled', 'Status changed to cancelled');

    // 15. Cannot change cancelled appointment
    console.log('\n1️⃣5️⃣ Testing modification of cancelled appointment (Expect 400)...');
    const modCancelledRes = await req(`${BASE_URL}/appointments/${confApptId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert(modCancelledRes.status === 400, `Rejected transition on cancelled appointment with HTTP ${modCancelledRes.status}: "${modCancelledRes.data?.message}"`);

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
