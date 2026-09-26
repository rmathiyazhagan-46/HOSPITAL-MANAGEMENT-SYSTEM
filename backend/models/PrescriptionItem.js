const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PrescriptionItem = sequelize.define('PrescriptionItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  prescription_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'prescriptions',
      key: 'id',
    },
  },
  medicine_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'medicines',
      key: 'id',
    },
  },
  dosage: {
    type: DataTypes.STRING(100),
    allowNull: false, // e.g. "500mg" or "1 tablet"
  },
  frequency: {
    type: DataTypes.STRING(100),
    allowNull: true, // Legacy support
  },
  dosage_schedule: {
    type: DataTypes.JSON, // e.g. [{"time_label": "Morning", "timing": "Before Food"}, ...]
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(50),
    allowNull: false, // e.g. "5 days"
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'prescription_items',
  timestamps: true,
});

module.exports = PrescriptionItem;
