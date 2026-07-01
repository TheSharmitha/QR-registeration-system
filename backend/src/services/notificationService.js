const logger = require('../utils/logger');

/**
 * Sends a confirmation message to the patient upon registration approval.
 * Supports formatting dates to IST and contains placeholders for Twilio/WhatsApp API.
 */
async function sendWhatsAppConfirmation(patientName, phoneNumber, ascasPatientId, appointmentDate, appointmentTime, doctorName) {
  try {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    logger.info('Notification Service: Preparing approval message for %s (%s)...', patientName, phoneNumber);

    // Placeholder: Twilio / WhatsApp Business API Gateway Integration
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   from: 'whatsapp:+14155238886',
    //   to: `whatsapp:${phoneNumber}`,
    //   body: `Hello ${patientName}, your registration at ASCAS has been approved! Your Patient ID is ${ascasPatientId}. Your appointment is confirmed with Dr. ${doctorName} on ${formattedDate} at ${appointmentTime}. Please show your ID at the front desk upon arrival.`
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    logger.info('Notification Service: Message successfully sent to %s. Content: "Hello %s, your registration at ASCAS has been approved! Your Patient ID is %s. Your appointment is confirmed with Dr. %s on %s at %s. Please show your ID at the front desk upon arrival."',
      phoneNumber, patientName, ascasPatientId, doctorName, formattedDate, appointmentTime
    );

    return { success: true, provider: 'MOCK_GATEWAY' };
  } catch (error) {
    logger.error('Notification Service: Failed to send approval message to %s: %s', phoneNumber, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a rejection message to the patient upon registration rejection.
 */
async function sendWhatsAppRejection(patientName, phoneNumber, remarks) {
  try {
    logger.info('Notification Service: Preparing rejection message for %s (%s)...', patientName, phoneNumber);

    // Placeholder: Twilio / WhatsApp Business API Gateway Integration
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   from: 'whatsapp:+14155238886',
    //   to: `whatsapp:${phoneNumber}`,
    //   body: `Hello ${patientName}, your recent ASCAS online registration could not be completed. Reason: ${remarks}. Please try scheduling for another date by re-submitting the form or contact our front desk directly.`
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    logger.info('Notification Service: Message successfully sent to %s. Content: "Hello %s, your recent ASCAS online registration could not be completed. Reason: %s. Please try scheduling for another date by re-submitting the form or contact our front desk directly."',
      phoneNumber, patientName, remarks
    );

    return { success: true, provider: 'MOCK_GATEWAY' };
  } catch (error) {
    logger.error('Notification Service: Failed to send rejection message to %s: %s', phoneNumber, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWhatsAppConfirmation,
  sendWhatsAppRejection,
};
