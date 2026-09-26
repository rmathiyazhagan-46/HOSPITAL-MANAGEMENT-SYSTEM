const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
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
  prescription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'prescriptions',
      key: 'id',
    },
  },
  consultation_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'consultations',
      key: 'id',
    },
  },
  invoice_type: {
    type: DataTypes.ENUM('consultation', 'pharmacy', 'combined', 'final'),
    allowNull: false,
    defaultValue: 'consultation',
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'pending_verification', 'paid'),
    allowNull: false,
    defaultValue: 'pending',
  },
  paid_marked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejection_reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
});

module.exports = Invoice;
