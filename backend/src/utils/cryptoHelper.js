const crypto = require('crypto');
const logger = require('./logger');

// Security: Require ENCRYPTION_KEY to be configured in production, fall back to default if missing
if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
  logger.error('WARNING: ENCRYPTION_KEY environment variable is missing in production! Utilizing local fallback key (Insecure for production).');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a plain text string using AES-256-CBC.
 * Generates a dynamic 16-byte IV and prepends it to the output.
 */
function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv and encrypted content joined by a colon
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Data encryption failed');
  }
}

/**
 * Decrypts an AES-256-CBC encrypted string of format "iv:ciphertext".
 */
function decrypt(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      // If it doesn't match the format, return as is (e.g. seed placeholders or unencrypted fields)
      return text;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return 'DECRYPTION_ERROR';
  }
}

/**
 * Helper to mask Aadhaar number to show only the last 4 digits.
 * E.g., "123456789012" -> "XXXX-XXXX-9012"
 */
function maskAadhaar(aadhaarStr) {
  if (!aadhaarStr) return '';
  // Clean non-digits
  const digits = aadhaarStr.replace(/\D/g, '');
  if (digits.length < 4) return digits;
  const lastFour = digits.slice(-4);
  return `XXXX-XXXX-${lastFour}`;
}

module.exports = {
  encrypt,
  decrypt,
  maskAadhaar
};
