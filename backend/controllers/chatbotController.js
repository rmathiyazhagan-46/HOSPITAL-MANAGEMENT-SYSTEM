const { matchIntent } = require('../utils/chatbotIntents');
const { 
  Doctor, 
  Department, 
  Appointment, 
  Consultation, 
  Prescription, 
  PrescriptionItem, 
  Medicine, 
  Invoice,
  Admin
} = require('../models');

// Process chat messages through the intent recognition engine
const handleChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message string.',
      });
    }

    const intentResult = matchIntent(message);

    // 1. Suggested Doctors lookup if intent is doctor discovery or department specific
    let suggestedDoctors = [];
    if (intentResult.department) {
      suggestedDoctors = await Doctor.findAll({
        include: [{
          model: Department,
          as: 'department',
          where: { name: intentResult.department },
        }],
        limit: 3,
        attributes: ['id', 'name', 'specialization', 'experience_years', 'consultation_fee', 'availability_status'],
      });
    }

    // 2. Patient Tracking Status Card
    let cardData = null;
    let cardType = intentResult.cardType || 'text';

    if (intentResult.intentId === 'track_report' && req.user?.id) {
      cardType = 'track_status';
      const latestAppt = await Appointment.findOne({
        where: { patient_id: req.user.id },
        include: [
          { model: Doctor, as: 'doctor', attributes: ['name', 'specialization'] },
          { model: Department, as: 'department', attributes: ['name'] },
        ],
        order: [['appointment_date', 'DESC'], ['id', 'DESC']],
      });

      const latestConsultation = await Consultation.findOne({
        where: { patient_id: req.user.id },
        include: [
          { model: Doctor, as: 'doctor', attributes: ['name'] },
          {
            model: Prescription,
            as: 'prescriptions',
            include: [{ model: PrescriptionItem, as: 'items', include: [{ model: Medicine, as: 'medicine' }] }],
          },
        ],
        order: [['consultation_date', 'DESC'], ['id', 'DESC']],
      });

      const latestInvoice = await Invoice.findOne({
        where: { patient_id: req.user.id },
        order: [['createdAt', 'DESC']],
      });

      cardData = {
        appointment: latestAppt ? {
          id: latestAppt.id,
          doctor: latestAppt.doctor?.name,
          specialization: latestAppt.doctor?.specialization,
          department: latestAppt.department?.name,
          date: latestAppt.appointment_date,
          time: latestAppt.time_slot,
          status: latestAppt.status,
        } : null,
        consultation: latestConsultation ? {
          id: latestConsultation.id,
          doctor: latestConsultation.doctor?.name,
          date: latestConsultation.consultation_date,
          diagnosis: latestConsultation.diagnosis_notes || latestConsultation.diagnosis,
          diagnosis_notes: latestConsultation.diagnosis_notes,
          prescriptionStatus: latestConsultation.prescriptions && latestConsultation.prescriptions.length > 0 ? 'Prescription Dispensed' : 'Consultation Recorded',
          medicineCount: latestConsultation.prescriptions?.[0]?.items?.length || 0,
        } : null,
        invoice: latestInvoice ? {
          id: latestInvoice.id,
          amount: latestInvoice.amount,
          status: latestInvoice.status,
          type: latestInvoice.invoice_type,
        } : null,
      };
    }

    // 3. Reception Escalation Card
    if (intentResult.intentId === 'reception_escalation') {
      const adminRecord = await Admin.findOne({ attributes: ['hospital_name', 'hospital_email'] });
      cardType = 'reception_card';
      cardData = {
        title: adminRecord?.hospital_name ? `${adminRecord.hospital_name} Reception & Support` : 'Hospital Reception & Support',
        phone: process.env.HOSPITAL_PHONE || '+91 98765 43210',
        emergencyPhone: '108 / 112',
        email: adminRecord?.hospital_email || 'support@hospital.org',
        location: 'Ground Floor, Main Reception Lobby',
        hours: '24 Hours / 7 Days a Week',
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        query: message,
        reply: intentResult.reply,
        urgency: intentResult.urgency || 'NORMAL',
        matchedDepartment: intentResult.department || null,
        suggestedDoctors,
        actions: intentResult.actions || [],
        cardType,
        cardData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Real-time status tracker for the logged-in patient
const getPatientTrackingStatus = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const appointment = await Appointment.findOne({
      where: { patient_id: patientId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'specialization'] },
        { model: Department, as: 'department', attributes: ['name'] },
      ],
      order: [['appointment_date', 'DESC'], ['id', 'DESC']],
    });

    const consultation = await Consultation.findOne({
      where: { patient_id: patientId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name'] },
        {
          model: Prescription,
          as: 'prescriptions',
          include: [{ model: PrescriptionItem, as: 'items', include: [{ model: Medicine, as: 'medicine' }] }],
        },
      ],
      order: [['consultation_date', 'DESC'], ['id', 'DESC']],
    });

    const invoice = await Invoice.findOne({
      where: { patient_id: patientId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: {
        appointment: appointment ? {
          id: appointment.id,
          doctor: appointment.doctor?.name,
          specialization: appointment.doctor?.specialization,
          department: appointment.department?.name,
          date: appointment.appointment_date,
          time: appointment.time_slot,
          status: appointment.status,
        } : null,
        consultation: consultation ? {
          id: consultation.id,
          doctor: consultation.doctor?.name,
          date: consultation.consultation_date,
          diagnosis: consultation.diagnosis_notes || consultation.diagnosis,
          diagnosis_notes: consultation.diagnosis_notes,
          prescriptionStatus: consultation.prescriptions && consultation.prescriptions.length > 0 ? 'Prescription Dispensed' : 'Consultation Recorded',
          medicineCount: consultation.prescriptions?.[0]?.items?.length || 0,
        } : null,
        invoice: invoice ? {
          id: invoice.id,
          amount: invoice.amount,
          status: invoice.status,
          type: invoice.invoice_type,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleChatMessage,
  getPatientTrackingStatus,
};
