const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // 1. Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      logger.warn('Authentication failure: Username "%s" not found from IP %s', username, req.ip);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Authentication failure: Incorrect password for user "%s" from IP %s', username, req.ip);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 3. Generate JWT Token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info('User "%s" logged in successfully from IP %s', username, req.ip);

    // 4. Return user info and token
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    logger.error('Login error for username %s: %s', username, error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  login,
};
