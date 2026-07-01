const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Initializes background cron jobs.
 */
function initCronJobs() {
  // Prune PENDING registrations that are older than 7 days
  // Runs every night at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    logger.info('CRON: Running nightly cleanup of expired pending registrations...');
    
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 7);

      const deletedCount = await prisma.tmpPatientDetails.deleteMany({
        where: {
          registration_status: 'PENDING',
          submitted_at: {
            lt: expirationDate,
          },
        },
      });

      logger.info('CRON: Pruning complete. Deleted %d old pending registrations.', deletedCount.count);
    } catch (error) {
      logger.error('CRON: Nightly cleanup failed: %s', error.stack);
    }
  });

  // Daily registration report logging
  // Runs every day at 11:59 PM (59 23 * * *)
  cron.schedule('59 23 * * *', async () => {
    logger.info('CRON: Generating daily summary of registrations...');
    
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const approvedToday = await prisma.tmpPatientDetails.count({
        where: {
          registration_status: 'APPROVED',
          approved_at: {
            gte: startOfDay,
          },
        },
      });

      const rejectedToday = await prisma.tmpPatientDetails.count({
        where: {
          registration_status: 'REJECTED',
          approved_at: {
            gte: startOfDay,
          },
        },
      });

      const pendingRemaining = await prisma.tmpPatientDetails.count({
        where: {
          registration_status: 'PENDING',
        },
      });

      logger.info('DAILY REPORT: Approved Today: %d, Rejected Today: %d, Remaining Pending in Queue: %d',
        approvedToday, rejectedToday, pendingRemaining
      );
    } catch (error) {
      logger.error('CRON: Daily summary generation failed: %s', error.stack);
    }
  });

  logger.info('CRON: Background cron tasks initialized successfully.');
}

module.exports = {
  initCronJobs,
};
