const logger = require('./logger');

/**
 * Mock service to send WhatsApp message confirmation to the patient.
 * In a real application, this would invoke a WhatsApp Business API provider (like Twilio, Gupshup, etc.)
 */
async function sendWhatsAppConfirmation(patientName, phoneNumber, ascasPatientId, appointmentDate, doctorName) {
  try {
    const formattedDate = new Date(appointmentDate).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const messagePayload = {
      to: phoneNumber,
      template: 'ascas_patient_registered',
      parameters: {
        patient_name: patientName,
        ascas_id: ascasPatientId,
        appointment_time: formattedDate,
        doctor: doctorName,
      },
    };

    logger.info('WhatsApp Hook Triggered: Sending notification message to %s...', phoneNumber, {
      meta: {
        to: phoneNumber,
        patientName,
        ascasPatientId,
        appointmentDate: formattedDate,
        doctorName,
      }
    });

    // Simulate Network Latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    logger.info('WhatsApp Notification Sent Successfully to %s. Content: "Hello %s, your registration with ASCAS is approved! ID: %s. Appointment scheduled on %s with %s."',
      phoneNumber, patientName, ascasPatientId, formattedDate, doctorName
    );

    return {
      success: true,
      messageId: `wa_msg_${Math.random().toString(36).substring(2, 11)}`,
    };
  } catch (error) {
    logger.error('WhatsApp service hook failed for user %s: %s', patientName, error.message);
    // Don't throw to prevent rolling back db transaction in case notification fails
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendWhatsAppConfirmation,
};
