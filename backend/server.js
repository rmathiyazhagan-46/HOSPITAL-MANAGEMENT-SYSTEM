const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { 
  sequelize, 
  testConnection, 
  syncDatabase, 
  Admin, 
  Department, 
  Doctor, 
  Patient,
  Appointment,
  Consultation,
  Prescription,
  PrescriptionItem,
  Medicine, 
  MedicineStock,
  Invoice,
  Payment,
} = require('./models');
const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or any localhost/127.0.0.1 in dev
    if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate Limiter
app.use('/api', apiLimiter);

// API Routes
app.use('/api', apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Hospital Management System (HMS) REST API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);


// Start Server
const startServer = async () => {
  try {
    await testConnection();
    await syncDatabase({ alter: false });
    // await seedInitialData(); // Moved to seeders.js

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🏥 Hospital Management System Backend API is active`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`💳 UPI ID Loaded: ${process.env.HOSPITAL_UPI_ID || 'gangaganga2235@oksbi'}`);
      console.log(`🏨 Hospital Name: ${process.env.HOSPITAL_NAME || 'Metro General Apex Hospital'}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
