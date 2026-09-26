const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

async function runTest() {
  try {
    console.log('1. Logging in as Doctor...');
    const docLogin = await req(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: JSON.stringify({ employee_id: 'DOC-2026-0002', password: 'Doctor@123' }),
    });
    assert(docLogin.ok, 'Doctor login failed');
    const doctorToken = docLogin.data.token;
    const doctorId = docLogin.data.doctor.id;
    console.log('✅ Logged in as Doctor');

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    console.log(`2. Applying for leave for today (${today})...`);
    const applyLeave = await req(`${BASE_URL}/doctors/portal/leaves`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        from_date: today,
        to_date: today,
        reason: 'Testing auto-approval flow',
      }),
    });
    
    // Auto-approval should mean the record is created with 'Approved' status directly
    assert(applyLeave.ok, 'Leave application failed');
    assert(applyLeave.data.data.status === 'Approved', 'Leave was not auto-approved');
    const createdLeaveId = applyLeave.data.data.id;
    console.log('✅ Leave applied and automatically set to Approved on creation');

    console.log('3. Checking Patient Portal (Directory & Available Slots)...');
    // 3a. Check GET /doctors directory (used by Patient choose doctor step)
    const patientDocList = await req(`${BASE_URL}/doctors`);
    assert(patientDocList.ok, 'Failed to fetch public/patient doctor list');
    const patientDoctorView = patientDocList.data.data.find(d => d.id === doctorId);
    assert(patientDoctorView, 'Doctor not found in directory');
    assert(patientDoctorView.availability_status === 'on_leave', `availability_status is '${patientDoctorView.availability_status}', expected 'on_leave'`);
    assert(patientDoctorView.card_availability_text === 'Today Unavailable', `card_availability_text is '${patientDoctorView.card_availability_text}', expected 'Today Unavailable'`);
    console.log('✅ Patient portal directory shows doctor badge as "Today Unavailable"');

    // 3b. Check slot availability
    const slotsRes = await req(`${BASE_URL}/appointments/available-slots?doctor_id=${doctorId}&date=${today}`);
    assert(slotsRes.ok, 'Failed to fetch slots');
    assert(slotsRes.data.data.isDayUnavailable === true, 'Doctor should be marked as unavailable for today in patient portal');
    console.log('✅ Patient portal slot-picker blocks booking (isDayUnavailable = true)');

    console.log('4. Logging in as Admin...');
    const adminLogin = await req(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: JSON.stringify({
        hospital_name: 'Metro General Apex Hospital',
        email: 'admin@hospital.org',
        password: 'admin123',
      }),
    });
    assert(adminLogin.ok, 'Admin login failed');
    const adminToken = adminLogin.data.token;
    console.log('✅ Logged in as Admin');

    console.log('5. Checking Admin Portal (Doctor Management Status column)...');
    const adminDocsRes = await req(`${BASE_URL}/doctors`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDocsRes.ok, 'Failed to fetch doctors list for admin');
    const adminDoctorView = adminDocsRes.data.data.find(d => d.id === doctorId);
    assert(adminDoctorView.availability_status === 'on_leave', 'Admin doctor view availability_status should be on_leave');
    assert(adminDoctorView.availability_text === 'Unavailable', `Admin doctor view availability_text should be 'Unavailable', got '${adminDoctorView.availability_text}'`);
    console.log('✅ Admin Portal Doctor Management Status column shows "Unavailable" (red badge)');

    console.log('6. Checking Admin Doctor Leaves List (Record Keeping)...');
    const leavesListRes = await req(`${BASE_URL}/doctors/leaves/all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(leavesListRes.ok, 'Failed to fetch all leaves for admin');
    const leaveRecord = leavesListRes.data.data.find(l => l.id === createdLeaveId);
    assert(leaveRecord, 'Leave record not found in admin leaves list');
    assert(leaveRecord.status === 'Approved', `Leave record status in admin list is '${leaveRecord.status}', expected 'Approved'`);
    console.log('✅ Admin Doctor Leaves list shows doctor-submitted leave as "Approved" (no action required)');

    // Clean up test leave
    const { DoctorLeave } = require('./models');
    await DoctorLeave.destroy({ where: { id: createdLeaveId } });
    console.log('🧹 Cleaned up test leave record');

    console.log('\n🎉 ALL TESTS PASSED! The doctor leave auto-approval and instant availability sync are 100% verified.');
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message || error);
    process.exit(1);
  }
}

runTest();
