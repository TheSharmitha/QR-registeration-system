const logger = require('../utils/logger');
let twilioClient = null;

// Initialize Twilio client if credentials are provided in the environment
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER } = process.env;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    logger.info('Notification Service: Twilio client initialized successfully.');
  } catch (err) {
    logger.error('Notification Service: Failed to initialize Twilio client: %s', err.message);
  }
} else {
  logger.warn('Notification Service: Twilio credentials missing. Running in mock fallback mode.');
}

/**
 * Dispatches the message via Twilio (SMS or WhatsApp) or falls back to console mock logs.
 */
async function dispatchMessage({ to, body, useWhatsApp = true }) {
  if (!twilioClient) {
    logger.info('Notification Service (MOCK FALLBACK): Send to %s: "%s"', to, body);
    return { success: true, provider: 'MOCK_GATEWAY' };
  }

  try {
    const fromNumber = useWhatsApp 
      ? `whatsapp:${TWILIO_WHATSAPP_NUMBER}` 
      : TWILIO_PHONE_NUMBER;
    
    const toNumber = useWhatsApp ? `whatsapp:${to}` : to;

    logger.info('Notification Service: Dispatching Twilio message to %s...', toNumber);
    
    const response = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });

    logger.info('Notification Service: Twilio message sent successfully. SID: %s', response.sid);
    return { success: true, sid: response.sid, provider: 'TWILIO' };
  } catch (err) {
    logger.error('Notification Service: Twilio API dispatch failed for recipient %s: %s', to, err.message);
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

  return dispatchMessage({ to: phoneNumber, body, useWhatsApp: true });
}

/**
 * Sends a rejection message to the patient upon registration rejection.
 */
async function sendWhatsAppRejection(patientName, phoneNumber, remarks) {
  const body = `Hello ${patientName}, your recent ASCAS online registration could not be completed. Reason: ${remarks}. Please try scheduling for another date by re-submitting the form or contact our front desk directly.`;

  return dispatchMessage({ to: phoneNumber, body, useWhatsApp: true });
}

module.exports = {
  sendWhatsAppConfirmation,
  sendWhatsAppRejection,
};
