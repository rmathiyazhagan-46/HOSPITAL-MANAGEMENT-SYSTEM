const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MedicineStock = sequelize.define('MedicineStock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  medicine_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'medicines',
      key: 'id',
    },
  },
  batch_number: {
    type: DataTypes.STRING(80),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  manufacture_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  reorder_level: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'medicine_stocks',
  timestamps: true,
});

module.exports = MedicineStock;
