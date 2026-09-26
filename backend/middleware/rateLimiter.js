const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Limit each IP to 1500 requests per window (supports dashboard polling)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter limiter for admin & doctor authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit each IP to 30 auth requests per 15 minutes
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again later.',
  },
});

// Dedicated strict rate limiter for Patient 3-field login (prevent brute force)
const patientLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts per 15 minutes per patient_id + IP combination
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per patient_id + IP combination
    const patientId = req.body?.patient_id ? String(req.body.patient_id).trim() : '';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    return `${clientIp}_${patientId}`;
  },
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  patientLoginLimiter,
};
