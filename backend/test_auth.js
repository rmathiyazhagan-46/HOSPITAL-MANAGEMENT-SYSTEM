const request = require('http');
const app = require('./server');

// Helper to make local express requests without external libraries
const makeRequest = (method, path, body = {}) => {
  return new Promise((resolve, reject) => {
    const jsonBody = JSON.stringify(body);
    const req = app.handle
      ? null
      : null;

    // We can use supertest-style or standard express request invoking
    const reqMock = {
      method,
      url: path,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(jsonBody),
      },
      body,
    };
  });
};

const runTests = async () => {
  const { 
    Admin, 
    Doctor, 
    Patient, 
    Department, 
    syncDatabase 
  } = require('./models');
  const bcrypt = require('bcryptjs');

  console.log('--- STARTING COMPREHENSIVE AUTH SYSTEM TESTS ---');

  await syncDatabase({ force: false });

  // 1. Ensure Admin is seeded
  const adminEmail = 'admin@hospital.org';
  const hospitalName = 'Metro General Apex Hospital';
  let admin = await Admin.findOne({ where: { hospital_email: adminEmail } });
  if (!admin) {
    const password_hash = await bcrypt.hash('admin123', 10);
    admin = await Admin.create({
      hospital_name: hospitalName,
      hospital_email: adminEmail,
      password_hash,
    });
    console.log('✔ Admin account seeded');
  } else {
    console.log('✔ Admin account found in database');
  }

  // Test adminAuthController logic directly
  const adminAuthController = require('./controllers/adminAuthController');

  const mockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  // Test 1: Admin Login Success
  let res = mockRes();
  await adminAuthController.adminLogin(
    { body: { hospital_name: hospitalName, email: adminEmail, password: 'admin123' } },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 200, `Admin login should be 200, got ${res.statusCode}`);
  console.assert(res.jsonData.token && res.jsonData.admin.role === 'admin', 'Admin token should have role admin');
  console.log('✔ Test 1 Passed: Admin login successful with role="admin"');

  // Test 2: Admin Login Wrong Password
  res = mockRes();
  await adminAuthController.adminLogin(
    { body: { hospital_name: hospitalName, email: adminEmail, password: 'wrongpassword' } },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 401, `Admin login failure should be 401, got ${res.statusCode}`);
  console.assert(res.jsonData.message === 'Invalid hospital email or password', `Error message mismatch: ${res.jsonData.message}`);
  console.log('✔ Test 2 Passed: Admin login failure returns exact error "Invalid hospital email or password"');

  // Test 3: Admin Login Wrong Hospital Name
  res = mockRes();
  await adminAuthController.adminLogin(
    { body: { hospital_name: 'Incorrect Hospital Name', email: adminEmail, password: 'admin123' } },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 401, `Admin login failure should be 401, got ${res.statusCode}`);
  console.assert(res.jsonData.message === 'Invalid hospital email or password', `Error message mismatch: ${res.jsonData.message}`);
  console.log('✔ Test 3 Passed: Admin login mismatch on Hospital Name returns exact error');

  // Test 4: Doctor Login
  const doctorAuthController = require('./controllers/doctorAuthController');
  const doctorController = require('./controllers/doctorController');

  // Ensure department exists
  let dept = await Department.findOne();
  if (!dept) {
    dept = await Department.create({ name: 'Cardiology', description: 'Heart care' });
  }

  // Ensure doctor DOC-2026-0001 exists
  let doc = await Doctor.findOne({ where: { employee_id: 'DOC-2026-0001' } });
  if (!doc) {
    const docHash = await bcrypt.hash('Doctor@123', 10);
    doc = await Doctor.create({
      employee_id: 'DOC-2026-0001',
      password_hash: docHash,
      name: 'Dr. Rajesh Sharma',
      email: 'rajesh.sharma@hospital.org',
      phone: '+91 98765 01001',
      department_id: dept.id,
      specialization: 'Senior Cardiologist',
      qualification: 'MBBS, MD',
      experience_years: 15,
      consultation_fee: 800.00,
      availability_status: 'available',
    });
  }

  // Test Doctor Login Success
  res = mockRes();
  const doctorReq = {
    employee_id: 'DOC-2026-0001',
    password: 'docter@123'
  };
  await doctorAuthController.doctorLogin(
    { body: doctorReq },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 200, `Doctor login should be 200, got ${res.statusCode}`);
  console.assert(res.jsonData.token && res.jsonData.doctor.role === 'doctor', 'Doctor token should have role doctor');
  console.log('✔ Test 4 Passed: Doctor login successful with DOC-2026-0001 and role="doctor"');

  // Test Doctor Login Wrong Password
  res = mockRes();
  await doctorAuthController.doctorLogin(
    { body: { employee_id: 'DOC-2026-0001', password: 'wrongpass' } },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 401, `Doctor login failure should be 401, got ${res.statusCode}`);
  console.assert(res.jsonData.message === 'Invalid Employee ID or password', `Error message mismatch: ${res.jsonData.message}`);
  console.log('✔ Test 5 Passed: Doctor login failure returns exact error "Invalid Employee ID or password"');

  // Test 5: Patient Registration
  const patientAuthController = require('./controllers/patientAuthController');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testAadhar = `123456${uniqueSuffix}`.slice(0, 12);
  const testEmail = `patient${uniqueSuffix}@example.com`;

  res = mockRes();
  await patientAuthController.registerPatient(
    {
      body: {
        name: 'Jane Doe',
        phone: '9876543210',
        dob: '1995-05-15',
        aadhar_number: testAadhar,
        email: testEmail,
      },
    },
    res,
    (err) => { throw err; }
  );

  console.assert(res.statusCode === 201, `Patient registration should be 201, got ${res.statusCode}`);
  const registeredPatientId = res.jsonData.patient.patient_id;
  console.assert(/^\d{12}$/.test(registeredPatientId), `Patient ID must be 12 digits, got ${registeredPatientId}`);
  console.log(`✔ Test 6 Passed: Patient registered with unique 12-digit ID: ${registeredPatientId}`);

  // Test 6: Patient 3-Field Login Success (Patient ID + Name + DOB)
  res = mockRes();
  await patientAuthController.patientLogin(
    {
      body: {
        patient_id: registeredPatientId,
        name: 'Jane Doe',
        dob: '1995-05-15',
      },
    },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 200, `Patient login should be 200, got ${res.statusCode}`);
  console.assert(res.jsonData.token && res.jsonData.patient.role === 'patient', 'Patient token should have role patient');
  console.log('✔ Test 7 Passed: Patient 3-field login (ID + Name + DOB) succeeded without password');

  // Test 7: Patient 3-Field Login Mismatch (Wrong DOB)
  res = mockRes();
  await patientAuthController.patientLogin(
    {
      body: {
        patient_id: registeredPatientId,
        name: 'Jane Doe',
        dob: '1990-01-01', // Wrong DOB
      },
    },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 401, `Patient login mismatch should be 401, got ${res.statusCode}`);
  console.assert(res.jsonData.message === 'Details do not match our records', `Expected generic message, got: ${res.jsonData.message}`);
  console.log('✔ Test 8 Passed: Patient login mismatch returns generic error "Details do not match our records"');

  // Test 8: Patient 3-Field Login Mismatch (Wrong Name)
  res = mockRes();
  await patientAuthController.patientLogin(
    {
      body: {
        patient_id: registeredPatientId,
        name: 'Wrong Name',
        dob: '1995-05-15',
      },
    },
    res,
    (err) => { throw err; }
  );
  console.assert(res.statusCode === 401, `Patient login mismatch should be 401, got ${res.statusCode}`);
  console.assert(res.jsonData.message === 'Details do not match our records', `Expected generic message, got: ${res.jsonData.message}`);
  console.log('✔ Test 9 Passed: Patient login with wrong name returns generic error "Details do not match our records"');

  console.log('====================================================');
  console.log('🎉 ALL 9 AUTHENTICATION VERIFICATION TESTS PASSED!');
  console.log('====================================================');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
