const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Internal Endpoint (JWT): POST /api/users/register
 * Admin only. Registers a new staff user.
 */
async function registerStaff(req, res) {
  // 1. Authorize - Check if requesting user is an ADMIN
  if (!req.user || req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized registration attempt: User "%s" tried to create a user from IP %s', req.user?.username || 'unknown', req.ip);
    return res.status(403).json({ error: 'Access denied. Only administrators can create new staff accounts.' });
  }

  const { username, password, name, role } = req.body;

  try {
    // 2. Check duplicate username
    const existingUser = await prisma.staffUser.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create StaffUser
    const newStaff = await prisma.staffUser.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
      },
    });

    // 5. Audit Log
    logger.info('AUDIT: New staff user created. Username: "%s", Role: "%s". Created by: "%s" from IP: %s',
      username, role, req.user.username, req.ip, {
        meta: {
          action: 'CREATE_STAFF_USER',
          newUsername: username,
          role,
          createdBy: req.user.username,
        }
      }
    );

    return res.status(201).json({
      message: 'Staff user created successfully.',
      user: {
        id: newStaff.id,
        username: newStaff.username,
        name: newStaff.name,
        role: newStaff.role,
        created_at: newStaff.created_at,
      },
    });

  } catch (error) {
    logger.error('Failed to register staff user "%s": %s', username, error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Optional Helper: GET /api/users
 * Returns list of all users (also ADMIN protected) for verification/grid display.
 */
async function getStaffList(req, res) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const list = await prisma.staffUser.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        created_at: true,
      }
    });
    return res.json(list);
  } catch (error) {
    logger.error('Failed to list staff: %s', error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  registerStaff,
  getStaffList,
};
