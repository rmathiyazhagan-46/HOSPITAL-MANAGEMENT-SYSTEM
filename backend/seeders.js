const bcrypt = require('bcryptjs');
const { Admin, Department, Doctor, Patient, Appointment, Consultation, Prescription, PrescriptionItem, Medicine, MedicineStock, Invoice, Payment } = require('./models');

// Comprehensive Realistic Seed Function
const seedInitialData = async () => {
  try {
    // 1. Seed Admin
    const adminCount = await Admin.count();
    if (adminCount === 0) {
      const adminPass = await bcrypt.hash('admin123', 10);
      await Admin.create({
        hospital_name: 'Metro General Apex Hospital',
        hospital_email: 'admin@hospital.org',
        password_hash: adminPass,
      });
      console.log('[Seed] Admin account created: admin@hospital.org / admin123');
    }

    // 2. Seed Departments
    const requiredDepts = [
      { name: 'Cardiology', description: 'Comprehensive heart care, cardiovascular surgery and diagnostics' },
      { name: 'Neurology', description: 'Brain, spine, peripheral nerve, and neurological therapeutics' },
      { name: 'Orthopedics', description: 'Bone, joint, sports medicine, spine, and joint replacement surgery' },
      { name: 'Pediatrics', description: 'Child wellness, neonatal care, growth monitoring and immunizations' },
      { name: 'Dermatology', description: 'Clinical skin therapeutics, allergy diagnosis, hair and nail treatments' },
      { name: 'General Medicine', description: 'Internal medicine, disease prevention, acute illness management' },
      { name: 'Emergency & Critical Care', description: '24/7 trauma triage, resuscitation, intensive care unit' },
    ];

    for (const rd of requiredDepts) {
      const existing = await Department.findOne({ where: { name: rd.name } });
      if (!existing) {
        await Department.create(rd);
      }
    }

    const allDepts = await Department.findAll();
    const deptMap = {};
    allDepts.forEach(d => { deptMap[d.name] = d.id; });
    const defaultDeptId = allDepts[0]?.id || 1;

    // 3. Seed 8 Doctors across departments
    const docCount = await Doctor.count();
    
    // Always ensure the default password is correct for all seeded doctors
    const correctDocPass = await bcrypt.hash('docter@123', 10);

    if (docCount < 15) {
      const doctorsToSeed = [
        { employee_id: 'DOC-2026-0001', password_hash: correctDocPass, name: 'Dr. Arun Kumar', email: 'arun@hospital.org', phone: '+91 98765 01008', department_id: deptMap['Cardiology'] || defaultDeptId, specialization: 'Interventional Cardiology', qualification: 'MBBS MD DM', experience_years: 10, consultation_fee: 800.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0002', password_hash: correctDocPass, name: 'Dr. Ravi Kumar', email: 'ravi@hospital.org', phone: '+91 98765 01009', department_id: deptMap['Dermatology'] || defaultDeptId, specialization: 'Clinical Dermatology', qualification: 'MBBS MD', experience_years: 8, consultation_fee: 600.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0003', password_hash: correctDocPass, name: 'Dr. Anu Raj', email: 'anu@hospital.org', phone: '+91 98765 01010', department_id: deptMap['Neurology'] || defaultDeptId, specialization: 'Clinical Neurology', qualification: 'MBBS MD DM', experience_years: 9, consultation_fee: 900.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0004', password_hash: correctDocPass, name: 'Dr. Priya', email: 'priya@hospital.org', phone: '+91 98765 01011', department_id: deptMap['Pediatrics'] || defaultDeptId, specialization: 'Pediatric Medicine', qualification: 'MBBS MD', experience_years: 7, consultation_fee: 600.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0005', password_hash: correctDocPass, name: 'Dr. Ajay Kumar', email: 'ajay@hospital.org', phone: '+91 98765 01012', department_id: deptMap['Orthopedics'] || defaultDeptId, specialization: 'Orthopedic Surgery', qualification: 'MBBS MS', experience_years: 11, consultation_fee: 800.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0006', password_hash: correctDocPass, name: 'Dr. Meena', email: 'meena@hospital.org', phone: '+91 98765 01013', department_id: deptMap['General Medicine'] || defaultDeptId, specialization: 'Internal Medicine', qualification: 'MBBS MD', experience_years: 12, consultation_fee: 700.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0007', password_hash: correctDocPass, name: 'Dr. Siva Kumar', email: 'siva@hospital.org', phone: '+91 98765 01014', department_id: deptMap['Cardiology'] || defaultDeptId, specialization: 'Interventional Cardiology', qualification: 'MBBS MD DM', experience_years: 14, consultation_fee: 1000.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0008', password_hash: correctDocPass, name: 'Dr. Neha', email: 'neha@hospital.org', phone: '+91 98765 01015', department_id: deptMap['Dermatology'] || defaultDeptId, specialization: 'Cosmetic Dermatology', qualification: 'MBBS MD', experience_years: 6, consultation_fee: 600.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0009', password_hash: correctDocPass, name: 'Dr. Kiran', email: 'kiran@hospital.org', phone: '+91 98765 01016', department_id: deptMap['Emergency & Critical Care'] || defaultDeptId, specialization: 'Critical Care Medicine', qualification: 'MBBS MD', experience_years: 10, consultation_fee: 900.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0010', password_hash: correctDocPass, name: 'Dr. Deepa', email: 'deepa@hospital.org', phone: '+91 98765 01017', department_id: deptMap['General Medicine'] || defaultDeptId, specialization: 'Preventive Medicine', qualification: 'MBBS MD', experience_years: 8, consultation_fee: 650.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0011', password_hash: correctDocPass, name: 'Dr. Manoj', email: 'manoj@hospital.org', phone: '+91 98765 01018', department_id: deptMap['Neurology'] || defaultDeptId, specialization: 'Neuro-Electrophysiology', qualification: 'MBBS MD DM', experience_years: 13, consultation_fee: 950.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0012', password_hash: correctDocPass, name: 'Dr. Divya', email: 'divya@hospital.org', phone: '+91 98765 01019', department_id: deptMap['Pediatrics'] || defaultDeptId, specialization: 'Pediatric Cardiology', qualification: 'MBBS MD DNB', experience_years: 9, consultation_fee: 700.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0013', password_hash: correctDocPass, name: 'Dr. Vijay', email: 'vijay@hospital.org', phone: '+91 98765 01020', department_id: deptMap['Orthopedics'] || defaultDeptId, specialization: 'Joint Replacement Surgery', qualification: 'MBBS MS', experience_years: 10, consultation_fee: 750.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0014', password_hash: correctDocPass, name: 'Dr. Lakshmi', email: 'lakshmi@hospital.org', phone: '+91 98765 01021', department_id: deptMap['Emergency & Critical Care'] || defaultDeptId, specialization: 'Emergency Medicine', qualification: 'MBBS MD', experience_years: 12, consultation_fee: 850.00, availability_status: 'available' },
        { employee_id: 'DOC-2026-0015', password_hash: correctDocPass, name: 'Dr. Sanjay', email: 'sanjay@hospital.org', phone: '+91 98765 01022', department_id: deptMap['General Medicine'] || defaultDeptId, specialization: 'Diabetes & Hypertension', qualification: 'MBBS MD', experience_years: 7, consultation_fee: 650.00, availability_status: 'available' },
      ];

      for (const docData of doctorsToSeed) {
        const existing = await Doctor.findOne({ where: { employee_id: docData.employee_id } });
        if (!existing) {
          await Doctor.create(docData);
        }
      }
      console.log('[Seed] 15 Hospital doctors verified/seeded.');
    }
    
    // Always forcefully update existing seeded doctors to the correct password hash in case it was wrong
    await Doctor.update(
      { password_hash: correctDocPass },
      { where: {} } // update all for demo purposes to ensure they all work with docter@123
    );
    console.log('[Seed] All doctor passwords reset to "docter@123".');

    // 4. Seed 16 Patients with valid 12-digit IDs
    const patientCount = await Patient.count();
    if (patientCount < 16) {
      const samplePatients = [
        { name: 'Aarav Sharma', phone: '9876543001', dob: '1988-03-12', aadhar: '100020260001', email: 'aarav.sharma@example.com' },
        { name: 'Diya Patel', phone: '9876543002', dob: '1992-07-24', aadhar: '100020260002', email: 'diya.patel@example.com' },
        { name: 'Rohan Gupta', phone: '9876543003', dob: '1980-11-05', aadhar: '100020260003', email: 'rohan.gupta@example.com' },
        { name: 'Ananya Verma', phone: '9876543004', dob: '1995-09-18', aadhar: '100020260004', email: 'ananya.verma@example.com' },
        { name: 'Kabir Mehta', phone: '9876543005', dob: '1975-01-30', aadhar: '100020260005', email: 'kabir.mehta@example.com' },
        { name: 'Pooja Reddy', phone: '9876543006', dob: '1990-04-14', aadhar: '100020260006', email: 'pooja.reddy@example.com' },
        { name: 'Siddharth Roy', phone: '9876543007', dob: '1984-12-08', aadhar: '100020260007', email: 'siddharth.roy@example.com' },
        { name: 'Neha Chawla', phone: '9876543008', dob: '1998-06-22', aadhar: '100020260008', email: 'neha.chawla@example.com' },
        { name: 'Aditya Kulkarni', phone: '9876543009', dob: '1979-08-19', aadhar: '100020260009', email: 'aditya.k@example.com' },
        { name: 'Ritu Deshmukh', phone: '9876543010', dob: '1993-02-11', aadhar: '100020260010', email: 'ritu.d@example.com' },
        { name: 'Manish Tiwari', phone: '9876543011', dob: '1986-10-27', aadhar: '100020260011', email: 'manish.t@example.com' },
        { name: 'Shreya Ghosh', phone: '9876543012', dob: '1996-05-03', aadhar: '100020260012', email: 'shreya.g@example.com' },
        { name: 'Varun Bhatia', phone: '9876543013', dob: '1982-01-15', aadhar: '100020260013', email: 'varun.b@example.com' },
        { name: 'Tanvi Saxena', phone: '9876543014', dob: '1991-11-20', aadhar: '100020260014', email: 'tanvi.s@example.com' },
        { name: 'Harsh Vardhan', phone: '9876543015', dob: '1970-07-09', aadhar: '100020260015', email: 'harsh.v@example.com' },
        { name: 'Kiran Nambiar', phone: '9876543016', dob: '1989-09-30', aadhar: '100020260016', email: 'kiran.n@example.com' },
      ];

      for (let i = 0; i < samplePatients.length; i++) {
        const p = samplePatients[i];
        const assignedId = `99202600${String(i + 1).padStart(4, '0')}`;
        const existing = await Patient.findOne({ where: { patient_id: assignedId } });
        if (!existing) {
          await Patient.create({
            patient_id: assignedId,
            name: p.name,
            phone: p.phone,
            dob: p.dob,
            aadhar_number: p.aadhar,
            email: p.email,
          });
        }
      }
      console.log('[Seed] 16 Sample patients verified/seeded (IDs: 992026000001 - 992026000016).');
    }

    // 5. Seed Medicines & Inventory Batches (12 standard medicines + low-stock and expiring alerts)
    const { medicineSeedData } = require('./seedMedicines');
    const medCount = await Medicine.count();
    if (medCount < 20) {
      for (const m of medicineSeedData) {
        let med = await Medicine.findOne({ where: { name: m.name } });
        if (!med) {
          med = await Medicine.create({
            name: m.name,
            category: m.category,
            unit_price: m.unit_price,
            description: m.description,
          });
          await MedicineStock.create({
            medicine_id: med.id,
            batch_number: m.batch_number,
            quantity: m.quantity,
            expiry_date: m.expiry_date,
            reorder_level: m.reorder_level,
          });
        }
      }
      console.log('[Seed] 20 Standard medicines catalog with low-stock & expiry alerts seeded.');
    }

    // 6. Seed Appointments, Consultations, Prescriptions, Invoices
    const apptCount = await Appointment.count();
    if (apptCount < 5) {
      const allPatients = await Patient.findAll({ limit: 8 });
      const doc1 = await Doctor.findOne({ where: { employee_id: 'DOC-2026-0001' } });
      const doc2 = await Doctor.findOne({ where: { employee_id: 'DOC-2026-0002' } });
      const med1 = await Medicine.findOne();

      if (allPatients.length >= 4 && doc1 && doc2) {
        // Appt 1: Completed consultation
        const appt1 = await Appointment.create({
          patient_id: allPatients[0].id,
          doctor_id: doc1.id,
          department_id: doc1.department_id,
          appointment_date: '2026-09-01',
          time_slot: '09:30 - 10:00',
          status: 'completed',
          source: 'manual',
        });

        const cons1 = await Consultation.create({
          appointment_id: appt1.id,
          doctor_id: doc1.id,
          patient_id: allPatients[0].id,
          diagnosis_notes: 'Mild hypertension detected (BP 142/92). Recommended lifestyle adjustments and low-sodium diet.',
          consultation_date: '2026-09-01',
        });

        if (med1) {
          const presc1 = await Prescription.create({
            consultation_id: cons1.id,
            doctor_id: doc1.id,
            patient_id: allPatients[0].id,
            notes: 'Take with water after breakfast.',
          });
          await PrescriptionItem.create({
            prescription_id: presc1.id,
            medicine_id: med1.id,
            dosage: '1 tablet',
            frequency: 'Once daily in the morning',
            duration: '14 days',
          });
        }

        const inv1 = await Invoice.create({
          patient_id: allPatients[0].id,
          invoice_type: 'consultation',
          amount: 800.00,
          status: 'paid',
        });
        await Payment.create({
          invoice_id: inv1.id,
          amount_paid: 800.00,
          payment_mode: 'upi',
          paid_at: new Date('2026-09-01T10:15:00Z'),
        });

        // Appt 2: Upcoming confirmed
        await Appointment.create({
          patient_id: allPatients[1].id,
          doctor_id: doc1.id,
          department_id: doc1.department_id,
          appointment_date: '2026-09-10',
          time_slot: '10:00 - 10:30',
          status: 'confirmed',
          source: 'manual',
        });

        // Appt 3: Pending payment invoice
        await Invoice.create({
          patient_id: allPatients[1].id,
          invoice_type: 'consultation',
          amount: 800.00,
          status: 'pending',
        });

        // Appt 4: Completed with doc2
        const appt4 = await Appointment.create({
          patient_id: allPatients[2].id,
          doctor_id: doc2.id,
          department_id: doc2.department_id,
          appointment_date: '2026-09-03',
          time_slot: '11:00 - 11:30',
          status: 'completed',
          source: 'chatbot',
        });

        await Consultation.create({
          appointment_id: appt4.id,
          doctor_id: doc2.id,
          patient_id: allPatients[2].id,
          diagnosis_notes: 'Tension headaches due to ocular strain and prolonged screen hours. Recommended eye test and ergonomic correction.',
          consultation_date: '2026-09-03',
        });

        const inv4 = await Invoice.create({
          patient_id: allPatients[2].id,
          invoice_type: 'consultation',
          amount: 900.00,
          status: 'paid',
        });
        await Payment.create({
          invoice_id: inv4.id,
          amount_paid: 900.00,
          payment_mode: 'card',
        });

        // Seed today's active appointments so doctor today's queue is populated
        const todayStr = new Date().toISOString().split('T')[0];
        const existingToday1 = await Appointment.findOne({
          where: { doctor_id: doc1.id, appointment_date: todayStr, time_slot: '09:30 - 10:00' },
        });
        if (!existingToday1) {
          await Appointment.create({
            patient_id: allPatients[0].id,
            doctor_id: doc1.id,
            department_id: doc1.department_id,
            appointment_date: todayStr,
            time_slot: '09:30 - 10:00',
            status: 'confirmed',
            source: 'manual',
          });
        }

        const existingToday2 = await Appointment.findOne({
          where: { doctor_id: doc1.id, appointment_date: todayStr, time_slot: '11:00 - 11:30' },
        });
        if (!existingToday2) {
          await Appointment.create({
            patient_id: allPatients[1].id,
            doctor_id: doc1.id,
            department_id: doc1.department_id,
            appointment_date: todayStr,
            time_slot: '11:00 - 11:30',
            status: 'pending',
            source: 'chatbot',
          });
        }

        const existingToday3 = await Appointment.findOne({
          where: { doctor_id: doc2.id, appointment_date: todayStr, time_slot: '10:30 - 11:00' },
        });
        if (!existingToday3) {
          await Appointment.create({
            patient_id: allPatients[2].id,
            doctor_id: doc2.id,
            department_id: doc2.department_id,
            appointment_date: todayStr,
            time_slot: '10:30 - 11:00',
            status: 'confirmed',
            source: 'manual',
          });
        }

        console.log('[Seed] Realistic clinical workflow appointments and invoices seeded.');
      }
    }
  } catch (seedErr) {
    console.warn('[Seed] Notice during seed:', seedErr.message);
  }
};

if (require.main === module) {
  seedInitialData().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
module.exports = seedInitialData;
