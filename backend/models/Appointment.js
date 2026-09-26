const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'patients',
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
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time_slot: {
    type: DataTypes.STRING(30),
    allowNull: false, // e.g. "09:00 - 09:30"
  },
  blood_group: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  consultation_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  prescription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'prescriptions',
      key: 'id',
    },
  },
  source: {
    type: DataTypes.ENUM('manual', 'chatbot'),
    defaultValue: 'manual',
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'appointments',
  timestamps: true,
  indexes: [
    {
      name: 'idx_doctor_date_slot',
      fields: ['doctor_id', 'appointment_date', 'time_slot'],
    },
  ],
});

module.exports = Appointment;
