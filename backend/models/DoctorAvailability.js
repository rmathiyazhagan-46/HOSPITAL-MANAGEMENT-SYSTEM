const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DoctorAvailability = sequelize.define('DoctorAvailability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time_slot: {
    type: DataTypes.STRING(30),
    allowNull: true, // null means whole day is unavailable
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  recurring_day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: true, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    validate: {
      min: 0,
      max: 6,
    },
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName: 'doctor_availabilities',
  timestamps: true,
  indexes: [
    {
      name: 'idx_doctor_avail_date',
      fields: ['doctor_id', 'date'],
    },
    {
      name: 'idx_doctor_avail_recurring',
      fields: ['doctor_id', 'is_recurring', 'recurring_day_of_week'],
    },
  ],
});

module.exports = DoctorAvailability;
