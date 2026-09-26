const { jsPDF } = require('jspdf');
const {
  Patient,
  Appointment,
  Doctor,
  Department,
  Consultation,
  Prescription,
  PrescriptionItem,
  Medicine,
  Invoice,
  Payment,
} = require('../models');

// Admin: View all registered patients with computed last_visit
const getAllPatients = async (req, res, next) => {
  try {
    const { search } = req.query;
    const patients = await Patient.findAll({
      attributes: { exclude: ['aadhar_number'] },
      include: [
        {
          model: Appointment,
          as: 'appointments',
          attributes: ['appointment_date', 'status'],
          separate: true,
          order: [['appointment_date', 'DESC']],
          limit: 1,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const mapped = patients.map((p) => {
      const pJson = p.toJSON();
      const lastAppt = pJson.appointments?.[0];
      pJson.last_visit = lastAppt ? lastAppt.appointment_date : 'No visits yet';
      delete pJson.appointments;
      return pJson;
    });

    let filtered = mapped;
    if (search) {
      const q = search.toLowerCase();
      filtered = mapped.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patient_id.includes(q) ||
          p.phone.includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
};

// Admin: Update patient details
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const { name, phone, dob, email } = req.body;

    if (email && email !== patient.email) {
      const duplicate = await Patient.findOne({ where: { email: String(email).trim().toLowerCase() } });
      if (duplicate && duplicate.id !== patient.id) {
        return res.status(400).json({ success: false, message: 'Email is already used by another patient.' });
      }
    }

    await patient.update({
      name: name ? String(name).trim() : patient.name,
      phone: phone ? String(phone).trim() : patient.phone,
      dob: dob || patient.dob,
      email: email ? String(email).trim().toLowerCase() : patient.email,
    });

    const result = patient.toJSON();
    delete result.aadhar_number;

    return res.status(200).json({ success: true, message: 'Patient record updated.', data: result });
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  const transaction = await Patient.sequelize.transaction();
  try {
    const { id } = req.params;
    const patient = await Patient.findByPk(id, { transaction });

    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    // Delete dependent records to satisfy RESTRICT foreign key constraints
    await Invoice.destroy({ where: { patient_id: id }, transaction });
    await Prescription.destroy({ where: { patient_id: id }, transaction });
    await Consultation.destroy({ where: { patient_id: id }, transaction });
    await Appointment.destroy({ where: { patient_id: id }, transaction });

    await patient.destroy({ transaction });
    await transaction.commit();

    return res.status(200).json({ success: true, message: 'Patient record deleted successfully.' });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Patient / Doctor: Patient complete medical records
// Strict scoping: Patients can ONLY view their own records (req.user.id)
const getPatientMedicalRecords = async (req, res, next) => {
  try {
    const targetPatientId = req.user.role === 'patient' ? req.user.id : req.params.patientId;

    if (!targetPatientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required.' });
    }

    const consultations = await Consultation.findAll({
      where: { patient_id: targetPatientId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'specialization'] },
        { model: Appointment, as: 'appointment', attributes: ['appointment_date', 'time_slot'] },
        {
          model: Prescription,
          as: 'prescriptions',
          include: [
            {
              model: PrescriptionItem,
              as: 'items',
              include: [{ model: Medicine, as: 'medicine', attributes: ['name', 'category'] }],
            },
          ],
        },
      ],
      order: [['consultation_date', 'DESC']],
    });

    return res.status(200).json({ success: true, data: consultations });
  } catch (error) {
    next(error);
  }
};

// Patient portal appointments (own appointments only)
const getPatientAppointments = async (req, res, next) => {
  try {
    const targetPatientId = req.user.role === 'patient' ? req.user.id : req.params.patientId;

    const appointments = await Appointment.findAll({
      where: { patient_id: targetPatientId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'specialization', 'consultation_fee'] },
        { model: Department, as: 'department', attributes: ['name'] },
        { model: Consultation, as: 'consultation' },
      ],
      order: [['appointment_date', 'DESC'], ['time_slot', 'ASC']],
    });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// Patient portal invoices (own invoices only)
const getPatientInvoices = async (req, res, next) => {
  try {
    const targetPatientId = req.user.role === 'patient' ? req.user.id : req.params.patientId;

    const invoices = await Invoice.findAll({
      where: { patient_id: targetPatientId },
      include: [
        { model: Payment, as: 'payments' },
        {
          model: Consultation,
          as: 'consultation',
          include: [
            {
              model: Doctor,
              as: 'doctor',
              attributes: ['id', 'name', 'specialization', 'consultation_fee'],
            },
          ],
        },
        {
          model: Prescription,
          as: 'prescription',
          include: [
            {
              model: PrescriptionItem,
              as: 'items',
              include: [
                {
                  model: Medicine,
                  as: 'medicine',
                  attributes: ['id', 'name', 'category', 'unit_price'],
                },
              ],
            },
            {
              model: Doctor,
              as: 'doctor',
              attributes: ['id', 'name', 'specialization'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

// Download official Medical Report & Prescription PDF slip
const downloadPrescriptionPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findByPk(id, {
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'specialization', 'qualification', 'employee_id'] },
        { model: Patient, as: 'patient', attributes: ['name', 'patient_id', 'phone', 'dob', 'email'] },
        { model: Appointment, as: 'appointment', attributes: ['appointment_date', 'time_slot'] },
        {
          model: Prescription,
          as: 'prescriptions',
          include: [
            {
              model: PrescriptionItem,
              as: 'items',
              include: [{ model: Medicine, as: 'medicine', attributes: ['name', 'category'] }],
            },
          ],
        },
      ],
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation record not found.' });
    }

    // Role check: patient can only access their own consultation
    if (req.user.role === 'patient' && consultation.patient_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to access this medical report.' });
    }

    const doc = new jsPDF();

    // Primary Header
    doc.setFillColor(15, 118, 110); // Deep Teal / Hospital Theme
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('PULSECARE HOSPITAL & RESEARCH CENTER', 105, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Center for Clinical Excellence | OPD Wing Block B | 24/7 Helpline: +91 98765 43210', 105, 18, { align: 'center' });

    // Document Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL CLINICAL ASSESSMENT & PRESCRIPTION REPORT', 14, 36);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Consultation Date: ${new Date(consultation.consultation_date).toLocaleDateString()} | Ref No: MED-REP-${consultation.id.toString().padStart(6, '0')}`, 14, 42);

    // Patient & Doctor Information Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 48, 182, 38, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 48, 182, 38, 2, 2, 'D');

    // Left - Patient
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('PATIENT PARTICULARS', 20, 56);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Name: ${consultation.patient?.name || 'N/A'}`, 20, 64);
    doc.text(`Patient ID: ${consultation.patient?.patient_id || 'N/A'}`, 20, 71);
    doc.text(`Contact: ${consultation.patient?.phone || 'N/A'} | DOB: ${consultation.patient?.dob || 'N/A'}`, 20, 78);

    // Right - Doctor
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('CONSULTING PHYSICIAN', 110, 56);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Doctor: Dr. ${consultation.doctor?.name || 'Assigned Physician'}`, 110, 64);
    doc.text(`Specialty: ${consultation.doctor?.specialization || 'Clinical Care'}`, 110, 71);
    doc.text(`Employee ID: ${consultation.doctor?.employee_id || 'N/A'}`, 110, 78);

    // Clinical Findings & Diagnosis Box
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(14, 92, 182, 28, 2, 2, 'F');
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(14, 92, 182, 28, 2, 2, 'D');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110);
    doc.text('CLINICAL DIAGNOSIS & PHYSICIAN ASSESSMENT', 20, 100);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitDiagnosis = doc.splitTextToSize(consultation.diagnosis_notes || 'No specific diagnostic notes recorded.', 170);
    doc.text(splitDiagnosis, 20, 108);

    // Prescribed Medicines Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Rx - PRESCRIBED MEDICATIONS & DOSAGE SCHEDULE', 14, 130);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 134, 182, 8, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('MEDICINE NAME', 18, 139);
    doc.text('DOSAGE', 90, 139);
    doc.text('FREQUENCY', 130, 139);
    doc.text('DURATION', 170, 139);

    let startY = 148;
    const items = consultation.prescriptions?.[0]?.items || [];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    if (items.length > 0) {
      items.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${item.medicine?.name || 'Prescription Drug'}`, 18, startY);
        doc.text(`${item.dosage}`, 90, startY);
        doc.text(`${item.frequency}`, 130, startY);
        doc.text(`${item.duration}`, 170, startY);
        doc.setDrawColor(241, 245, 249);
        doc.line(14, startY + 2, 196, startY + 2);
        startY += 8;
      });
    } else {
      doc.text('No prescription drugs required. General outpatient care advised.', 18, startY);
      startY += 8;
    }

    // Special Advice & Report Notes
    const rawNotes = consultation.prescriptions?.[0]?.notes || '';
    if (rawNotes) {
      startY += 4;
      const sections = rawNotes.split('\n\n');
      for (const section of sections) {
        if (section.startsWith('LABORATORY TESTS & MEDICAL REPORTS ORDERED:')) {
          const content = section.replace('LABORATORY TESTS & MEDICAL REPORTS ORDERED:', '').trim();
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(14, startY, 182, 16, 1, 1, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(14, startY, 182, 16, 1, 1, 'D');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 118, 110);
          doc.text('LABORATORY TESTS & MEDICAL REPORTS ORDERED:', 18, startY + 5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          const splitTests = doc.splitTextToSize(content, 174);
          doc.text(splitTests, 18, startY + 11);
          startY += 22;
        } else if (section.startsWith('DIET & LIFESTYLE ADVICE:')) {
          const content = section.replace('DIET & LIFESTYLE ADVICE:', '').trim();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 118, 110);
          doc.text('LIFESTYLE, DIET & GENERAL INSTRUCTIONS:', 14, startY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          const splitNotes = doc.splitTextToSize(content, 180);
          doc.text(splitNotes, 14, startY + 5);
          startY += 14;
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 118, 110);
          doc.text('PHYSICIAN NOTES & ADVICE:', 14, startY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          const splitNotes = doc.splitTextToSize(section, 180);
          doc.text(splitNotes, 14, startY + 5);
          startY += 14;
        }
      }
    }

    // Doctor Signature Area
    startY = Math.max(startY + 10, 240);
    doc.setDrawColor(148, 163, 184);
    doc.line(140, startY, 196, startY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Dr. ${consultation.doctor?.name || 'Attending Physician'}`, 140, startY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Authorized Medical Examiner`, 140, startY + 9);

    // Bottom Verification
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`* * * VERIFIED ELECTRONIC MEDICAL RECORD - PULSECARE HOSPITAL ID: MED-${consultation.id} * * *`, 105, 280, { align: 'center' });

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Medical_Report_${consultation.id}.pdf`);
    return res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPatients,
  updatePatient,
  deletePatient,
  getPatientMedicalRecords,
  getPatientAppointments,
  getPatientInvoices,
  downloadPrescriptionPdf,
};
