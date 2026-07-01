const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    logger.warn('Access Denied: Missing Authorization Header from IP %s', req.ip);
    return res.status(401).json({ error: 'Access denied. Missing token.' });
  }

  // Expect "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Access Denied: Invalid Authorization Header format from IP %s', req.ip);
    return res.status(401).json({ error: 'Access denied. Token format must be Bearer <token>.' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Access Denied: Invalid Token from IP %s. Error: %s', req.ip, error.message);
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}

module.exports = {
  verifyToken,
};
