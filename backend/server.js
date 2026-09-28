const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const {
  sequelize,
  testConnection,
  syncDatabase,
} = require('./models');

const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const {
  notFoundHandler,
  errorHandler,
} = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// SECURITY
// =====================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, mobile apps, curl, etc.
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost during development
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }

      // Allow production frontend
      return callback(null, true);
    },
    credentials: true,
  })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// LOGGER
// =====================================================

app.use(morgan('dev'));

// =====================================================
// DATABASE INITIALIZATION
// =====================================================

let databaseReady = null;

const initializeDatabase = async () => {
  if (!databaseReady) {
    databaseReady = (async () => {
      console.log('[Database] Initializing database...');

      // Test database connection
      await testConnection();

      console.log('[Database] Synchronizing database tables...');

      // Create missing tables without altering existing structure
      await syncDatabase({
        alter: false,
      });

      console.log(
        '[Database] Database connection and tables initialized successfully.'
      );
    })().catch((error) => {
      // Allow retry if initialization fails
      databaseReady = null;
      throw error;
    });
  }

  return databaseReady;
};

// =====================================================
// DATABASE MIDDLEWARE
// IMPORTANT: This MUST be BEFORE API ROUTES
// =====================================================

app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error(
      '[Database] Initialization failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error:
        process.env.NODE_ENV === 'production'
          ? undefined
          : error.message,
    });
  }
});

// =====================================================
// RATE LIMITER
// =====================================================

app.use('/api', apiLimiter);

// =====================================================
// API ROUTES
// =====================================================

app.use('/api', apiRoutes);

// =====================================================
// ROOT ROUTE
// =====================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message:
      'Welcome to the Hospital Management System (HMS) REST API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use(notFoundHandler);
app.use(errorHandler);

// =====================================================
// LOCAL DEVELOPMENT SERVER
// =====================================================

const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        '===================================================='
      );
      console.log(
        '🏥 Hospital Management System Backend API is active'
      );
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(
        `📊 Health Check: http://localhost:${PORT}/api/health`
      );
      console.log(
        `💳 UPI ID Loaded: ${process.env.HOSPITAL_UPI_ID ||
        'gangaganga2235@oksbi'
        }`
      );
      console.log(
        `🏨 Hospital Name: ${process.env.HOSPITAL_NAME ||
        'Metro General Apex Hospital'
        }`
      );
      console.log(
        '===================================================='
      );
    });
  } catch (error) {
    console.error(
      '[Server] Failed to start server:',
      error
    );

    process.exit(1);
  }
};

// =====================================================
// START ONLY FOR LOCAL DEVELOPMENT
// =====================================================

if (require.main === module) {
  startServer();
}

// =====================================================
// VERCEL / SERVERLESS EXPORT
// =====================================================

module.exports = app;