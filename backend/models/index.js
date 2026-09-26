const { sequelize, testConnection } = require('../config/db');

const Admin = require('./Admin');
const Department = require('./Department');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const Consultation = require('./Consultation');
const Prescription = require('./Prescription');
const Medicine = require('./Medicine');
const PrescriptionItem = require('./PrescriptionItem');
const MedicineStock = require('./MedicineStock');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const Notification = require('./Notification');
const DoctorAvailability = require('./DoctorAvailability');
const DoctorLeave = require('./DoctorLeave');

// ==========================================
// MODEL ASSOCIATIONS (Normalized to 3NF)
// ==========================================

// Doctor <-> DoctorAvailability (1:N)
Doctor.hasMany(DoctorAvailability, { foreignKey: 'doctor_id', as: 'availabilities', onDelete: 'CASCADE' });
DoctorAvailability.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Doctor <-> DoctorLeave (1:N)
Doctor.hasMany(DoctorLeave, { foreignKey: 'doctor_id', as: 'leaves', onDelete: 'CASCADE' });
DoctorLeave.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Department <-> Doctor (1:N)
Department.hasMany(Doctor, { foreignKey: 'department_id', as: 'doctors', onDelete: 'RESTRICT' });
Doctor.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Department <-> Appointment (1:N)
Department.hasMany(Appointment, { foreignKey: 'department_id', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Patient <-> Appointment (1:N)
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Doctor <-> Appointment (1:N)
Doctor.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'appointments', onDelete: 'RESTRICT' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Appointment <-> Consultation (1:1)
Appointment.hasOne(Consultation, { foreignKey: 'appointment_id', as: 'consultation', onDelete: 'CASCADE' });
Consultation.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

// Appointment <-> Prescription (1:1 link when completed)
Appointment.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription', constraints: false });
Prescription.hasOne(Appointment, { foreignKey: 'prescription_id', as: 'appointment_record', constraints: false });

// Doctor <-> Consultation (1:N)
Doctor.hasMany(Consultation, { foreignKey: 'doctor_id', as: 'consultations', onDelete: 'RESTRICT' });
Consultation.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Patient <-> Consultation (1:N)
Patient.hasMany(Consultation, { foreignKey: 'patient_id', as: 'consultations', onDelete: 'RESTRICT' });
Consultation.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Consultation <-> Prescription (1:N)
Consultation.hasMany(Prescription, { foreignKey: 'consultation_id', as: 'prescriptions', onDelete: 'CASCADE' });
Prescription.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

// Doctor <-> Prescription (1:N)
Doctor.hasMany(Prescription, { foreignKey: 'doctor_id', as: 'prescriptions', onDelete: 'RESTRICT' });
Prescription.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Patient <-> Prescription (1:N)
Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions', onDelete: 'RESTRICT' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Prescription <-> PrescriptionItem (1:N)
Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescription_id', as: 'items', onDelete: 'CASCADE' });
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

// Medicine <-> PrescriptionItem (1:N)
Medicine.hasMany(PrescriptionItem, { foreignKey: 'medicine_id', as: 'prescription_items', onDelete: 'RESTRICT' });
PrescriptionItem.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' });

// Medicine <-> MedicineStock (1:N)
Medicine.hasMany(MedicineStock, { foreignKey: 'medicine_id', as: 'stocks', onDelete: 'CASCADE' });
MedicineStock.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' });

// Patient <-> Invoice (1:N)
Patient.hasMany(Invoice, { foreignKey: 'patient_id', as: 'invoices', onDelete: 'RESTRICT' });
Invoice.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Prescription <-> Invoice (1:1 / 1:N)
Prescription.hasOne(Invoice, { foreignKey: 'prescription_id', as: 'invoice', onDelete: 'SET NULL' });
Invoice.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

// Consultation <-> Invoice (1:N)
Consultation.hasMany(Invoice, { foreignKey: 'consultation_id', as: 'invoices', onDelete: 'SET NULL' });
Invoice.belongsTo(Consultation, { foreignKey: 'consultation_id', as: 'consultation' });

// Invoice <-> Payment (1:N)
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// Doctor <-> Notification (1:N)
Doctor.hasMany(Notification, { foreignKey: 'recipient_id', as: 'notifications', constraints: false });
Notification.belongsTo(Doctor, { foreignKey: 'recipient_id', as: 'doctor', constraints: false });

const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);

    const { DataTypes } = require('sequelize');
    const qi = sequelize.getQueryInterface();

    // 1. Safely ensure manufacture_date column is present in medicine_stocks
    try {
      const stockTableDesc = await qi.describeTable('medicine_stocks');
      if (stockTableDesc && !stockTableDesc.manufacture_date) {
        await qi.addColumn('medicine_stocks', 'manufacture_date', {
          type: DataTypes.DATEONLY,
          allowNull: true,
        });
        console.log('[Database] Added manufacture_date column to medicine_stocks.');
      }
    } catch (colErr) {
      // Column might already exist
    }

    // 1.5 Safely ensure blood_group column is present in appointments
    try {
      const apptDesc = await qi.describeTable('appointments');
      if (apptDesc && !apptDesc.blood_group) {
        await qi.addColumn('appointments', 'blood_group', {
          type: DataTypes.STRING(10),
          allowNull: true,
        });
        console.log('[Database] Added blood_group column to appointments.');
      }
      if (apptDesc && !apptDesc.confirmed_at) {
        await qi.addColumn('appointments', 'confirmed_at', {
          type: DataTypes.DATE,
          allowNull: true,
        });
        console.log('[Database] Added confirmed_at column to appointments.');
      }
      if (apptDesc && !apptDesc.completed_at) {
        await qi.addColumn('appointments', 'completed_at', {
          type: DataTypes.DATE,
          allowNull: true,
        });
        console.log('[Database] Added completed_at column to appointments.');
      }
      if (apptDesc && !apptDesc.consultation_notes) {
        await qi.addColumn('appointments', 'consultation_notes', {
          type: DataTypes.TEXT,
          allowNull: true,
        });
        console.log('[Database] Added consultation_notes column to appointments.');
      }
      if (apptDesc && !apptDesc.prescription_id) {
        await qi.addColumn('appointments', 'prescription_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
        });
        console.log('[Database] Added prescription_id column to appointments.');
      }
    } catch (colErr) {
      // Column might already exist
    }

    // 2. Safely ensure quantity and unit_price columns are present in prescription_items
    try {
      const prescItemDesc = await qi.describeTable('prescription_items');
      if (prescItemDesc) {
        if (!prescItemDesc.quantity) {
          await qi.addColumn('prescription_items', 'quantity', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
          });
          console.log('[Database] Added quantity column to prescription_items.');
        }
        if (!prescItemDesc.unit_price) {
          await qi.addColumn('prescription_items', 'unit_price', {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
          });
          console.log('[Database] Added unit_price column to prescription_items.');
        }
      }
    } catch (colErr) {
      // Column might already exist
    }

    // 3. Safely ensure prescription_id, paid_marked_at, rejection_reason columns are in invoices
    try {
      const invoiceDesc = await qi.describeTable('invoices');
      if (invoiceDesc) {
        if (!invoiceDesc.prescription_id) {
          await qi.addColumn('invoices', 'prescription_id', {
            type: DataTypes.INTEGER,
            allowNull: true,
          });
          console.log('[Database] Added prescription_id column to invoices.');
        }
        if (!invoiceDesc.paid_marked_at) {
          await qi.addColumn('invoices', 'paid_marked_at', {
            type: DataTypes.DATE,
            allowNull: true,
          });
          console.log('[Database] Added paid_marked_at column to invoices.');
        }
        if (!invoiceDesc.rejection_reason) {
          await qi.addColumn('invoices', 'rejection_reason', {
            type: DataTypes.STRING,
            allowNull: true,
          });
          console.log('[Database] Added rejection_reason column to invoices.');
        }
        if (!invoiceDesc.consultation_id) {
          await qi.addColumn('invoices', 'consultation_id', {
            type: DataTypes.INTEGER,
            allowNull: true,
          });
          console.log('[Database] Added consultation_id column to invoices.');
        }
      }
    } catch (colErr) {
      // Columns might already exist
    }

    // 4. Safely ensure razorpay_payment_id and razorpay_order_id are in payments
    try {
      const paymentDesc = await qi.describeTable('payments');
      if (paymentDesc && !paymentDesc.razorpay_payment_id) {
        await qi.addColumn('payments', 'razorpay_payment_id', {
          type: DataTypes.STRING(100),
          allowNull: true,
        });
        console.log('[Database] Added razorpay_payment_id column to payments.');
      }
      if (paymentDesc && !paymentDesc.razorpay_order_id) {
        await qi.addColumn('payments', 'razorpay_order_id', {
          type: DataTypes.STRING(100),
          allowNull: true,
        });
        console.log('[Database] Added razorpay_order_id column to payments.');
      }
    } catch (colErr) {
      // Columns might already exist
    }

    console.log('[Database] All models were synchronized successfully.');
  } catch (error) {
    console.error('[Database] Failed to sync models:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  Admin,
  Department,
  Doctor,
  Patient,
  Appointment,
  Consultation,
  Prescription,
  Medicine,
  PrescriptionItem,
  MedicineStock,
  Invoice,
  Payment,
  Notification,
  DoctorAvailability,
  DoctorLeave,
};
