const { DataTypes } = require('sequelize');
const crypto = require('crypto');
const { sequelize } = require('../config/db');

// Helper to encrypt or hash sensitive Aadhar data
const hashAadhar = (aadhar) => {
  if (!aadhar) return null;
  return crypto.createHash('sha256').update(String(aadhar).trim()).digest('hex');
};

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  patient_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{12}$/, // exactly 12 digits
    },
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  aadhar_number: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    set(value) {
      if (value) {
        // Store hashed aadhar at rest for privacy and uniqueness check
        const cleanVal = String(value).replace(/\s+/g, '');
        this.setDataValue('aadhar_number', hashAadhar(cleanVal));
      }
    },
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
}, {
  tableName: 'patients',
  timestamps: true,
});

Patient.hashAadhar = hashAadhar;

module.exports = Patient;
