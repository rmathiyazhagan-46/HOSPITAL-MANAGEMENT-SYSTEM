const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Consultation = sequelize.define('Consultation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // 1:1 with Appointment
    references: {
      model: 'appointments',
      key: 'id',
    },
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'id',
    },
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id',
    },
  },
  diagnosis_notes: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  consultation_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'consultations',
  timestamps: true,
});

module.exports = Consultation;
