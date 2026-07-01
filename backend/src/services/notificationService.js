const logger = require('../utils/logger');

// Retrieve Textbelt API key if configured
const TEXTBELT_API_KEY = process.env.TEXTBELT_API_KEY || 'textbelt';

if (TEXTBELT_API_KEY === 'textbelt') {
  logger.info('Notification Service: Textbelt initialized with free key. Limit is 1 free SMS per day per IP.');
} else {
  logger.info('Notification Service: Textbelt initialized with custom API key.');
}

/**
 * Dispatches the message via Textbelt API.
 */
async function dispatchMessage({ to, body }) {
  // Ensure the phone number starts with a country code (Textbelt requires it, e.g. +91 or +1)
  let toNumber = to.trim();
  if (!toNumber.startsWith('+')) {
    // If it is a 10 digit number and no country code is set, default to Indian country code (+91)
    if (toNumber.length === 10) {
      toNumber = `+91${toNumber}`;
    } else {
      logger.warn('Notification Service: Phone number %s might be missing a country code prefix (+). Textbelt may fail.', toNumber);
    }
  }

  try {
    logger.info('Notification Service: Dispatching Textbelt SMS to %s...', toNumber);

    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: toNumber,
        message: body,
        key: TEXTBELT_API_KEY,
      }),
    });

    const data = await response.json();

    if (data.success) {
      logger.info('Notification Service: Textbelt SMS sent successfully to %s. Quota remaining: %s', toNumber, data.quotaRemaining);
      return { success: true, quotaRemaining: data.quotaRemaining, provider: 'TEXTBELT' };
    } else {
      logger.error('Notification Service: Textbelt API rejected dispatch to %s. Reason: %s', toNumber, data.error);
      return { success: false, error: data.error };
    }
  } catch (err) {
    logger.error('Notification Service: Textbelt dispatch failed for recipient %s: %s', toNumber, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a confirmation message to the patient upon registration approval.
 */
async function sendWhatsAppConfirmation(patientName, phoneNumber, ascasPatientId, appointmentDate, appointmentTime, doctorName) {
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const body = `Hello ${patientName}, your registration at ASCAS has been approved! Your Patient ID is ${ascasPatientId}. Your appointment is confirmed with Dr. ${doctorName} on ${formattedDate} at ${appointmentTime}. Please show your ID at the front desk upon arrival.`;

  return dispatchMessage({ to: phoneNumber, body });
}

/**
 * Sends a rejection message to the patient upon registration rejection.
 */
async function sendWhatsAppRejection(patientName, phoneNumber, remarks) {
  const body = `Hello ${patientName}, your recent ASCAS online registration could not be completed. Reason: ${remarks}. Please try scheduling for another date by re-submitting the form or contact our front desk directly.`;

  return dispatchMessage({ to: phoneNumber, body });
}

module.exports = {
  sendWhatsAppConfirmation,
  sendWhatsAppRejection,
};
