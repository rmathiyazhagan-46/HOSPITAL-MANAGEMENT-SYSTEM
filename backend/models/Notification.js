const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  recipient_type: {
    type: DataTypes.ENUM('doctor', 'patient', 'admin'),
    defaultValue: 'doctor',
    allowNull: false,
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_recipient_lookup',
      fields: ['recipient_type', 'recipient_id', 'is_read'],
    },
  ],
});

module.exports = Notification;
