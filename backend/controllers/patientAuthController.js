const jwt = require('jsonwebtoken');
const { Patient } = require('../models');
const { sendPatientRegistrationSms } = require('../utils/smsService');

const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'super_secret_jwt_key_hms_2026_secure_token',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Helper: Generate a unique 12-digit patient ID
const generatePatientId = async () => {
  let isUnique = false;
  let newId = '';

  while (!isUnique) {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    newId = `99${randomSuffix}`.slice(0, 12);
    const existing = await Patient.findOne({ where: { patient_id: newId } });
    if (!existing) {
      isUnique = true;
    }
  }

  return newId;
};

const registerPatient = async (req, res, next) => {
  try {
    const { name, phone, dob, aadhar_number, email } = req.body;

    if (!name || !phone || !dob || !aadhar_number || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, phone, dob, aadhar_number, email) are required.',
      });
    }

    const cleanAadhar = String(aadhar_number).replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanAadhar)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhar Number must be exactly 12 numeric digits.',
      });
    }

    // Check duplicate email
    const existingEmail = await Patient.findOne({ where: { email: String(email).trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this email already exists.',
      });
    }

    // Check duplicate aadhar
    const hashedAadhar = Patient.hashAadhar(cleanAadhar);
    const existingAadhar = await Patient.findOne({ where: { aadhar_number: hashedAadhar } });
    if (existingAadhar) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this Aadhar number is already registered.',
      });
    }

    const assignedPatientId = await generatePatientId();

    const newPatient = await Patient.create({
      patient_id: assignedPatientId,
      name: String(name).trim(),
      phone: String(phone).trim(),
      dob,
      aadhar_number: cleanAadhar, // Setter in model will hash it
      email: String(email).trim().toLowerCase(),
    });

    // Send Welcome SMS containing the newly generated 12-digit Patient ID (non-blocking)
    try {
      await sendPatientRegistrationSms({
        phone: newPatient.phone,
        patientId: newPatient.patient_id,
        hospitalName: 'Metro General Apex Hospital',
      });
    } catch (smsErr) {
      console.error('[Registration SMS Failed]:', smsErr.message);
    }

    const token = generateToken({
      id: newPatient.id,
      patientId: newPatient.patient_id,
      role: 'patient',
      name: newPatient.name,
      email: newPatient.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      token,
      patient: {
        id: newPatient.id,
        patient_id: newPatient.patient_id,
        name: newPatient.name,
        phone: newPatient.phone,
        email: newPatient.email,
        dob: newPatient.dob,
        role: 'patient',
      },
    });
  } catch (error) {
    next(error);
  }
};

const patientLogin = async (req, res, next) => {
  try {
    const { patient_id, name, dob } = req.body;

    if (!patient_id || !name || !dob) {
      return res.status(400).json({
        success: false,
        message: 'Details do not match our records',
      });
    }

    const cleanPatientId = String(patient_id).trim();
    if (!/^\d{12}$/.test(cleanPatientId)) {
      return res.status(401).json({
        success: false,
        message: 'Details do not match our records',
      });
    }

    const patient = await Patient.findOne({
      where: {
        patient_id: cleanPatientId,
      },
    });

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: 'Details do not match our records',
      });
    }

    // Check name and dob match exactly (case-insensitive for name, date match for dob)
    const reqName = String(name).trim().toLowerCase();
    const dbName = String(patient.name).trim().toLowerCase();
    const reqDob = String(dob).trim();
    const dbDob = String(patient.dob).trim();

    if (reqName !== dbName || reqDob !== dbDob) {
      return res.status(401).json({
        success: false,
        message: 'Details do not match our records',
      });
    }

    const token = generateToken({
      id: patient.id,
      patientId: patient.patient_id,
      role: 'patient',
      name: patient.name,
      email: patient.email,
    });

    return res.status(200).json({
      success: true,
      message: 'Patient login successful.',
      token,
      patient: {
        id: patient.id,
        patient_id: patient.patient_id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        dob: patient.dob,
        role: 'patient',
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPatientProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.user.id, {
      attributes: { exclude: ['aadhar_number'] },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerPatient,
  patientLogin,
  getPatientProfile,
};
