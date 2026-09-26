const BASE_URL = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  const config = {
    method,
    headers: reqHeaders,
  };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // not json
  }
  return { status: res.status, ok: res.ok, data };
}

async function runPermissionMatrixTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED ROLE-BASED PERMISSION MATRIX TEST');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  try {
    // 1. Log in Admin
    console.log('1. Authenticating Admin...');
    const adminLoginRes = await request(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      body: {
        hospital_name: 'Metro General Apex Hospital',
        email: 'admin@hospital.org',
        password: 'admin123',
      },
    });
    const adminToken = adminLoginRes.data?.token;
    assert(adminLoginRes.status === 200 && !!adminToken, 'Admin authentication successful');
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    // 2. Log in Doctor
    console.log('\n2. Authenticating Doctor...');
    const doctorLoginRes = await request(`${BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      body: {
        employee_id: 'DOC-2026-0001',
        password: 'Doctor@123',
      },
    });
    const doctorToken = doctorLoginRes.data?.token;
    assert(doctorLoginRes.status === 200 && !!doctorToken, 'Doctor authentication successful');
    const doctorAuth = { Authorization: `Bearer ${doctorToken}` };

    // 3. Log in Patient
    console.log('\n3. Authenticating Patient...');
    const patientLoginRes = await request(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      body: {
        patient_id: '993957875071',
        name: 'PRAVEEN A',
        dob: '2007-02-06',
      },
    });
    const patientToken = patientLoginRes.data?.token;
    assert(patientLoginRes.status === 200 && !!patientToken, 'Patient authentication successful');
    const patientAuth = { Authorization: `Bearer ${patientToken}` };

    // 4. ADMIN CAPABILITIES
    console.log('\n4. Testing Admin Capabilities (Full CRUD)...');
    // A) Doctor Management
    const doctorsRes = await request(`${BASE_URL}/doctors`, { headers: adminAuth });
    assert(doctorsRes.status === 200 && Array.isArray(doctorsRes.data?.data), 'Admin can view all doctors');

    // B) Auto-generate Doctor
    const createDocRes = await request(`${BASE_URL}/doctors`, {
      method: 'POST',
      headers: adminAuth,
      body: {
        name: 'Dr. Automated Permission Test',
        email: `autotest.doc.${Date.now()}@metroapex.org`,
        phone: '+91 99999 11111',
        department_id: 1,
        specialization: 'Test Specialty',
        qualification: 'MBBS, MD',
        experience_years: 6,
        consultation_fee: 750,
      },
    });
    const createdDoctor = createDocRes.data?.data;
    assert(
      createDocRes.status === 201 &&
      createdDoctor?.employee_id?.startsWith('DOC-') &&
      !!createdDoctor?.temp_password,
      'Admin creates doctor with auto-generated Employee ID and temp password',
      `ID: ${createdDoctor?.employee_id}`
    );

    // C) Edit Doctor
    const updateDocRes = await request(`${BASE_URL}/doctors/${createdDoctor.id}`, {
      method: 'PUT',
      headers: adminAuth,
      body: { specialization: 'Advanced Test Specialty', consultation_fee: 800 },
    });
    assert(updateDocRes.status === 200, 'Admin can update doctor details');

    // D) Patient Management with last_visit
    const patientsRes = await request(`${BASE_URL}/patients`, { headers: adminAuth });
    assert(
      patientsRes.status === 200 &&
      Array.isArray(patientsRes.data?.data) &&
      'last_visit' in (patientsRes.data?.data[0] || {}),
      'Admin can view all patients with computed last_visit'
    );

    // E) Hospital-wide Invoices & Revenue
    const invoicesRes = await request(`${BASE_URL}/billing/invoices`, { headers: adminAuth });
    assert(invoicesRes.status === 200 && Array.isArray(invoicesRes.data?.data), 'Admin can view hospital-wide invoices');

    const revenueRes = await request(`${BASE_URL}/billing/revenue`, { headers: adminAuth });
    assert(
      revenueRes.status === 200 &&
      'totalRevenue' in (revenueRes.data?.data || {}) &&
      Array.isArray(revenueRes.data?.data?.departmentBreakdown),
      'Admin can view revenue intelligence & department breakdown'
    );

    // F) Pharmacy Full CRUD
    const medRes = await request(`${BASE_URL}/pharmacy/medicines`, {
      method: 'POST',
      headers: adminAuth,
      body: {
        name: `Test Med ${Date.now()}`,
        category: 'Analgesics',
        unit_price: 45.5,
        batch_number: `BATCH-TEST-${Date.now().toString().slice(-4)}`,
        quantity: 150,
        expiry_date: '2028-12-31',
        reorder_level: 25,
      },
    });
    assert(medRes.status === 201 && (medRes.data?.data?.id || medRes.data?.data?.medicine?.id), 'Admin can create medicine & batch');

    // 5. DOCTOR ROLE BOUNDARIES (Strict 403 Checks)
    console.log('\n5. Testing Doctor Role Boundaries (Reject Unauthorized Routes with 403)...');

    // Doctor attempting Admin Patient Management -> 403
    const docPatientCheck = await request(`${BASE_URL}/patients`, { headers: doctorAuth });
    assert(docPatientCheck.status === 403, 'Doctor cannot access Admin Patient Management (403 Forbidden)');

    // Doctor attempting Admin Doctor Creation -> 403
    const docCreateDocCheck = await request(`${BASE_URL}/doctors`, {
      method: 'POST',
      headers: doctorAuth,
      body: { name: 'Dr. Hack' },
    });
    assert(docCreateDocCheck.status === 403, 'Doctor cannot create doctors (403 Forbidden)');

    // Doctor attempting Hospital Billing Invoices -> 403
    const docInvoicesCheck = await request(`${BASE_URL}/billing/invoices`, { headers: doctorAuth });
    assert(docInvoicesCheck.status === 403, 'Doctor cannot view hospital-wide invoices (403 Forbidden)');

    // Doctor attempting Revenue Analytics -> 403
    const docRevenueCheck = await request(`${BASE_URL}/billing/revenue`, { headers: doctorAuth });
    assert(docRevenueCheck.status === 403, 'Doctor cannot view revenue analytics (403 Forbidden)');

    // Doctor attempting Pharmacy Stock Edit -> 403
    const docStockCheck = await request(`${BASE_URL}/pharmacy/stock`, {
      method: 'POST',
      headers: doctorAuth,
      body: { medicine_id: 1, quantity: 10 },
    });
    assert(docStockCheck.status === 403, 'Doctor cannot update pharmacy stock (403 Forbidden)');

    // Doctor attempting Chatbot -> 403
    const docChatCheck = await request(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: doctorAuth,
      body: { message: 'Hello AI' },
    });
    assert(docChatCheck.status === 403, 'Doctor cannot access patient chatbot (403 Forbidden)');

    // Doctor authorized clinical queue access -> 200
    const docQueueRes = await request(`${BASE_URL}/doctors/portal/appointments`, { headers: doctorAuth });
    assert(docQueueRes.status === 200, 'Doctor can view their own clinical queue');

    // 6. PATIENT ROLE BOUNDARIES & DATA MASKING
    console.log('\n6. Testing Patient Role Boundaries & Masking...');

    // Patient attempting Admin Patient Management -> 403
    const patPatientCheck = await request(`${BASE_URL}/patients`, { headers: patientAuth });
    assert(patPatientCheck.status === 403, 'Patient cannot access Admin Patient Management (403 Forbidden)');

    // Patient attempting Doctor Creation -> 403
    const patCreateDocCheck = await request(`${BASE_URL}/doctors`, {
      method: 'POST',
      headers: patientAuth,
      body: { name: 'Dr. Hack' },
    });
    assert(patCreateDocCheck.status === 403, 'Patient cannot create doctors (403 Forbidden)');

    // Patient attempting Hospital Invoices -> 403
    const patInvoicesCheck = await request(`${BASE_URL}/billing/invoices`, { headers: patientAuth });
    assert(patInvoicesCheck.status === 403, 'Patient cannot view hospital invoices (403 Forbidden)');

    // Patient attempting Pharmacy Stock Edit -> 403
    const patStockCheck = await request(`${BASE_URL}/pharmacy/medicines`, {
      method: 'POST',
      headers: patientAuth,
      body: { name: 'Fake Med' },
    });
    assert(patStockCheck.status === 403, 'Patient cannot create medicines (403 Forbidden)');

    // Patient Pharmacy Medicine List - DATA MASKING CHECK
    const patientMedRes = await request(`${BASE_URL}/pharmacy/medicines`, { headers: patientAuth });
    const medItems = patientMedRes.data?.data || [];
    const firstMed = medItems[0] || {};
    const priceMasked = firstMed.unit_price === undefined;
    const stockMasked = firstMed.stocks === undefined && firstMed.quantity === undefined;
    const hasAvailability = !!firstMed.availability_status;

    assert(
      patientMedRes.status === 200 && priceMasked && stockMasked && hasAvailability,
      'Patient medicine list is strictly masked (No prices, quantities, or batches; only availability status)',
      `Sample: ${JSON.stringify(firstMed)}`
    );

    // Patient Own Records -> 200
    const patientRecordsRes = await request(`${BASE_URL}/patients/records`, { headers: patientAuth });
    assert(patientRecordsRes.status === 200 && Array.isArray(patientRecordsRes.data?.data), 'Patient can view own medical records');

    // Patient Chatbot -> 200
    const chatRes = await request(`${BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: patientAuth,
      body: { message: 'Can you tell me cardiology timings?' },
    });
    assert(chatRes.status === 200 && !!(chatRes.data?.data?.reply || chatRes.data?.reply), 'Patient can chat with AI chatbot');

    // Clean up created test doctor
    await request(`${BASE_URL}/doctors/${createdDoctor.id}`, {
      method: 'DELETE',
      headers: adminAuth,
    });
    console.log('\nCleaned up temporary test doctor.');

  } catch (error) {
    console.error('Fatal error during permission matrix test execution:', error.message);
  }

  console.log('\n====================================================');
  console.log(`PERMISSIONS MATRIX TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPermissionMatrixTests();
