const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Global Rate Limiter: Applied to all API routes (150 requests per 15 minutes per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  handler: (req, res, next, options) => {
    logger.warn('DoS Prevention: IP %s exceeded global rate limit of 150 requests/15m', req.ip);
    res.status(options.statusCode).json(options.message);
  }
});

// Strict Rate Limiter: Applied to public submission forms & login routes (5 submissions per 1 minute per IP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many submission attempts. Please wait 15 minutes before retrying.'
  },
  handler: (req, res, next, options) => {
    logger.warn('DoS Prevention: IP %s exceeded strict rate limit on sensitive route %s', req.ip, req.originalUrl);
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
};
