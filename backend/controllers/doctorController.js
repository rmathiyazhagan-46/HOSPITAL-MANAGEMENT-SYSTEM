const bcrypt = require('bcryptjs');
const { 
  sequelize,
  Doctor, 
  Department, 
  Appointment, 
  Patient, 
  Consultation, 
  Prescription, 
  PrescriptionItem, 
  Medicine, 
  MedicineStock,
  Invoice,
  Notification,
  DoctorLeave,
} = require('../models');
const { Op } = require('sequelize');
const { sendSms } = require('../utils/smsService');
const { getDoctorAvailability } = require('../utils/availabilityService');

// Get all doctors with department filtering
const getAllDoctors = async (req, res, next) => {
  try {
    const { department_id, specialization, availability } = req.query;
    const where = {};

    if (department_id) where.department_id = department_id;
    if (specialization) where.specialization = specialization;

    let doctors = await Doctor.findAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Department, as: 'department' },
        { 
          model: DoctorLeave, 
          as: 'leaves',
          where: { status: 'Approved' },
          required: false
        }
      ],
      order: [['name', 'ASC']],
    });

    const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    doctors = await Promise.all(doctors.map(async (doc) => {
      let docJson = doc.toJSON();
      
      const avail = await getDoctorAvailability(docJson.id, currentDate);
      
      // Map to exact required output for Admin and Patient
      if (avail.available) {
        docJson.availability_status = 'available';
        docJson.availability_text = 'Available';
        docJson.card_availability_text = 'Available Today';
      } else {
        docJson.availability_status = 'on_leave';
        docJson.availability_text = 'Unavailable';
        docJson.card_availability_text = 'Today Unavailable';
      }
      
      return docJson;
    }));

    if (availability) {
      doctors = doctors.filter(doc => doc.availability_status === availability);
    }

    return res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

// Get single doctor details
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Department, as: 'department' },
        { 
          model: DoctorLeave, 
          as: 'leaves',
          where: { status: 'Approved' },
          required: false
        }
      ],
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    let docJson = doctor.toJSON();

    const avail = await getDoctorAvailability(docJson.id, currentDate);
    if (avail.available) {
      docJson.availability_status = 'available';
      docJson.availability_text = 'Available';
      docJson.card_availability_text = 'Available Today';
    } else {
      docJson.availability_status = 'on_leave';
      docJson.availability_text = 'Unavailable';
      docJson.card_availability_text = 'Today Unavailable';
    }

    return res.status(200).json({ success: true, data: docJson });
  } catch (error) {
    next(error);
  }
};

// Helper to generate a secure random temporary password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Doc@${rand}`;
};

// Helper to generate next unique employee ID: DOC-{YEAR}-{4-digit sequence}
const generateEmployeeId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `DOC-${currentYear}-`;
  
  // Find all doctors with this year's prefix to find highest sequence
  const doctors = await Doctor.findAll({
    attributes: ['employee_id'],
  });

  let maxSeq = 0;
  for (const doc of doctors) {
    if (doc.employee_id && doc.employee_id.startsWith(prefix)) {
      const seqStr = doc.employee_id.slice(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let newEmpId = `${prefix}${String(nextSeq).padStart(4, '0')}`;

  // Double check uniqueness with loop
  while (await Doctor.findOne({ where: { employee_id: newEmpId } })) {
    nextSeq++;
    newEmpId = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  return newEmpId;
};

// Admin: Create new doctor
const createDoctor = async (req, res, next) => {
  try {
    let {
      employee_id,
      password,
      name,
      email,
      phone,
      department_id,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      availability_status,
    } = req.body;

    if (!employee_id || !String(employee_id).trim()) {
      employee_id = await generateEmployeeId();
    } else {
      employee_id = String(employee_id).trim().toUpperCase();
      const existingEmp = await Doctor.findOne({ where: { employee_id } });
      if (existingEmp) {
        return res.status(400).json({ success: false, message: 'Employee ID is already registered.' });
      }
    }

    const existingEmail = await Doctor.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Doctor email already registered.' });
    }

    const tempPassword = (password && String(password).trim()) ? String(password).trim() : generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const doctor = await Doctor.create({
      employee_id,
      password_hash: hashedPassword,
      name,
      email,
      phone,
      department_id,
      specialization,
      qualification,
      experience_years: experience_years || 0,
      consultation_fee: consultation_fee || 0,
      availability_status: availability_status || 'available',
    });

    const response = doctor.toJSON();
    delete response.password_hash;
    response.temp_password = tempPassword;

    return res.status(201).json({
      success: true,
      message: 'Doctor registered successfully.',
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

// Update doctor profile/status
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const fieldsToUpdate = { ...req.body };
    if (fieldsToUpdate.password) {
      fieldsToUpdate.password_hash = await bcrypt.hash(fieldsToUpdate.password, 10);
      delete fieldsToUpdate.password;
    }

    await doctor.update(fieldsToUpdate);
    const response = doctor.toJSON();
    delete response.password_hash;

    return res.status(200).json({ success: true, message: 'Doctor updated.', data: response });
  } catch (error) {
    next(error);
  }
};

// Delete doctor (Admin)
const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    try {
      await doctor.destroy();
      return res.status(200).json({ success: true, message: 'Doctor record removed.' });
    } catch (destroyError) {
      if (destroyError.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({ 
          success: false, 
          message: 'Cannot delete doctor: This doctor has existing appointments or medical records. Please edit their profile and set their Status to "Inactive" instead.' 
        });
      }
      throw destroyError;
    }
  } catch (error) {
    next(error);
  }
};

// Doctor: Get consultation queue / appointments
const getDoctorAppointments = async (req, res, next) => {
  try {
    const doctorId = req.user.role === 'doctor' ? req.user.id : req.query.doctor_id;
    const { date, status } = req.query;

    const where = { doctor_id: doctorId };
    if (date) where.appointment_date = date;
    if (status) where.status = status;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, as: 'patient', attributes: ['id', 'patient_id', 'name', 'phone', 'dob'] },
        { 
          model: Consultation, 
          as: 'consultation',
          include: [
            {
              model: Prescription,
              as: 'prescriptions',
              include: [
                {
                  model: PrescriptionItem,
                  as: 'items',
                  include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'unit_price'] }],
                },
              ],
            },
          ],
        },
      ],
      order: [['appointment_date', 'ASC'], ['time_slot', 'ASC']],
    });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// Doctor: Complete consultation & prescribe medicines with immediate stock deduction & automatic billing
const recordConsultationAndPrescription = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { appointment_id, patient_id, diagnosis_notes, prescription_notes, items } = req.body;

    const appointment = await Appointment.findByPk(appointment_id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    // Role & ownership check
    if (req.user.role === 'doctor' && appointment.doctor_id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only conduct consultations for appointments assigned to you.',
      });
    }

    // Strict status stage transition validation
    if (appointment.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot conduct consultation for a pending appointment. The appointment slot must be confirmed first.',
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This consultation has already been completed and finalized. Further edits are disabled.',
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot conduct consultation for a cancelled appointment.',
      });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Appointment status must be 'confirmed' to consult & prescribe, but is currently '${appointment.status}'.`,
      });
    }

    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const doctor = await Doctor.findByPk(doctorId);

    let resultData = null;
    let pharmacyInvoice = null;
    let totalPharmacyAmount = 0;
    const now = new Date();

    // Execute within a single database transaction with row-level locking
    await sequelize.transaction(async (t) => {
      // 1. Create Consultation
      const consultation = await Consultation.create({
        appointment_id,
        doctor_id: doctorId,
        patient_id,
        diagnosis_notes,
        consultation_date: new Date(),
      }, { transaction: t });

      let prescription = null;
      const processedItems = [];

      // 2. Create Prescription & deduct stock if medicines provided
      if (items && items.length > 0) {
        prescription = await Prescription.create({
          consultation_id: consultation.id,
          doctor_id: doctorId,
          patient_id,
          notes: prescription_notes || '',
        }, { transaction: t });

        for (const rawItem of items) {
          const reqQty = parseInt(rawItem.quantity, 10) || 1;
          if (reqQty <= 0) {
            const err = new Error('Prescription item quantity must be at least 1.');
            err.statusCode = 400;
            throw err;
          }

          // Fetch medicine with row update lock
          const medicine = await Medicine.findByPk(rawItem.medicine_id, {
            transaction: t,
            lock: t.LOCK ? t.LOCK.UPDATE : undefined,
          });

          if (!medicine) {
            const err = new Error(`Medicine record #${rawItem.medicine_id} not found in catalog.`);
            err.statusCode = 404;
            throw err;
          }

          // Fetch batches ordered by expiry_date ASC (FEFO - First Expired, First Out) with row lock
          const batches = await MedicineStock.findAll({
            where: { medicine_id: medicine.id },
            order: [['expiry_date', 'ASC']],
            transaction: t,
            lock: t.LOCK ? t.LOCK.UPDATE : undefined,
          });

          // Filter out expired batches (expiry_date < today)
          const validBatches = batches.filter((b) => {
            if (!b.expiry_date) return true;
            const exp = new Date(b.expiry_date + 'T23:59:59.999Z');
            return exp >= now && Number(b.quantity) > 0;
          });

          const totalAvailable = validBatches.reduce((acc, b) => acc + Number(b.quantity), 0);

          // Reject if requested quantity exceeds available non-expired stock
          if (totalAvailable < reqQty) {
            const err = new Error(
              `Insufficient stock for "${medicine.name}". Requested: ${reqQty} unit(s), but only ${totalAvailable} non-expired unit(s) available in dispensary.`
            );
            err.statusCode = 400;
            throw err;
          }

          // Deduct stock using FEFO (First-Expired, First-Out)
          let remainingToDeduct = reqQty;
          for (const batch of validBatches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(Number(batch.quantity), remainingToDeduct);
            await batch.update({
              quantity: Number(batch.quantity) - deduct,
            }, { transaction: t });
            remainingToDeduct -= deduct;
          }

          const unitPrice = Number(medicine.unit_price) || 0.00;
          const lineTotal = reqQty * unitPrice;
          totalPharmacyAmount += lineTotal;

          // Save PrescriptionItem with quantity and unit_price
          const createdItem = await PrescriptionItem.create({
            prescription_id: prescription.id,
            medicine_id: medicine.id,
            dosage: rawItem.dosage || 'Standard dose',
            frequency: rawItem.frequency || 'As directed', // fallback for legacy frontend
            dosage_schedule: rawItem.dosage_schedule || null,
            duration: rawItem.duration || '5 days',
            quantity: reqQty,
            unit_price: unitPrice,
          }, { transaction: t });

          processedItems.push({
            ...createdItem.toJSON(),
            medicine_name: medicine.name,
            line_total: lineTotal,
          });
        }

        // 3. Create a SINGLE COMBINED invoice (consultation + pharmacy)
        const doctorFee = doctor ? Number(doctor.consultation_fee) : 500.00;
        const grandTotal = doctorFee + totalPharmacyAmount;

        pharmacyInvoice = await Invoice.create({
          patient_id,
          consultation_id: consultation.id,
          prescription_id: prescription ? prescription.id : null,
          invoice_type: 'combined',
          amount: grandTotal,
          status: 'pending',
        }, { transaction: t });
      } else {
        // If no medicines prescribed, still create the combined invoice for consultation fee
        const doctorFee = doctor ? Number(doctor.consultation_fee) : 500.00;
        pharmacyInvoice = await Invoice.create({
          patient_id,
          consultation_id: consultation.id,
          prescription_id: null,
          invoice_type: 'combined',
          amount: doctorFee,
          status: 'pending',
        }, { transaction: t });
      }

      // 4. Mark appointment completed with timestamp and notes
      await appointment.update({
        status: 'completed',
        completed_at: new Date(),
        consultation_notes: diagnosis_notes,
        prescription_id: prescription ? prescription.id : null,
      }, { transaction: t });

      resultData = {
        consultation,
        prescription,
        pharmacyInvoice,
        processedItems,
      };
    });

    // 6. Post-transaction notifications (In-app + SMS)
    if (pharmacyInvoice && totalPharmacyAmount > 0) {
      // In-app Notification for patient
      try {
        await Notification.create({
          recipient_type: 'patient',
          recipient_id: patient_id,
          message: `New pharmacy invoice #${pharmacyInvoice.id} generated for your prescription. Total: ₹${totalPharmacyAmount.toFixed(2)}. Please check Bills & Payments to settle.`,
          is_read: false,
        });
      } catch (notifErr) {
        console.error('[Patient Notification Error]:', notifErr.message);
      }

      // SMS Notification for patient
      try {
        if (patient && patient.phone) {
          await sendSms({
            to: patient.phone,
            message: `PulseCare Hospital: A pharmacy bill of Rs. ${totalPharmacyAmount.toFixed(2)} has been generated for your recent prescription by Dr. ${doctor ? doctor.name : 'your doctor'}. Please review and pay in your patient portal.`,
          });
        }
      } catch (smsErr) {
        console.error('[Patient SMS Error]:', smsErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Consultation recorded, stock deducted, and pharmacy invoice generated successfully.',
      data: resultData,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAppointments,
  recordConsultationAndPrescription,
};
