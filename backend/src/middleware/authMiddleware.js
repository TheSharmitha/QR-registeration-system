const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Security: Require JWT_SECRET to be configured in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET environment variable is missing in production!');
  throw new Error('JWT_SECRET environment variable is required in production.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

// In-Memory Token Blacklist Store for Session Revocation
const tokenBlacklist = new Set();

/**
 * Revokes a JWT token immediately by adding it to the blacklist.
 * Automatically schedules removal from the set once the token expires to avoid memory leaks.
 */
function revokeToken(token) {
  if (!token) return;
  tokenBlacklist.add(token);
  
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const msToExpiry = (decoded.exp * 1000) - Date.now();
      if (msToExpiry > 0) {
        setTimeout(() => {
          tokenBlacklist.delete(token);
          logger.debug('Blacklist: Removed expired token from memory.');
        }, msToExpiry);
      }
    }
  } catch (err) {
    logger.error('Failed to parse token expiry for blacklist cleanup: %s', err.message);
  }
}

/**
 * Checks if a token has been blacklisted.
 */
function isTokenRevoked(token) {
  return tokenBlacklist.has(token);
}

/**
 * Verify JWT Token Middleware
 */
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

  // Check if token has been revoked (blacklisted)
  if (isTokenRevoked(token)) {
    logger.warn('Access Denied: Attempted use of revoked token from IP %s', req.ip);
    return res.status(401).json({ error: 'Access denied. This session has been logged out.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token; // Store token in request object for revocation route
    next();
  } catch (error) {
    logger.warn('Access Denied: Invalid Token from IP %s. Error: %s', req.ip, error.message);
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces that req.user.role belongs to allowed roles list.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access Forbidden: User "%s" (Role: %s) attempted to access route "%s" restricted to [%s] from IP %s',
        req.user.username,
        req.user.role,
        req.originalUrl,
        allowedRoles.join(', '),
        req.ip
      );
      return res.status(403).json({ error: 'Access denied. You do not have the required permissions.' });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole,
  revokeToken,
};
