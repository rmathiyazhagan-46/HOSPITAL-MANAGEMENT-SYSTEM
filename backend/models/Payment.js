const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id',
    },
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'upi_qr', 'netbanking', 'insurance'),
    allowNull: false,
    defaultValue: 'upi_qr',
  },
  razorpay_payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  razorpay_order_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  paid_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;
