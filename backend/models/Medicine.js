const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Medicine = sequelize.define('Medicine', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'General',
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'medicines',
  timestamps: true,
});

module.exports = Medicine;
