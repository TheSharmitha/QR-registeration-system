const logger = require('./logger');

/**
 * Mock service to send WhatsApp message confirmation to the patient.
 * In a real application, this would invoke a WhatsApp Business API provider (like Twilio, Gupshup, etc.)
 */
async function sendWhatsAppConfirmation(patientName, phoneNumber, ascasPatientId, appointmentDate, appointmentTime, doctorName) {
  try {
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    logger.info('WhatsApp Hook Triggered: Sending approval notification message to %s...', phoneNumber, {
      meta: {
        to: phoneNumber,
        patientName,
        ascasPatientId,
        appointmentDate: formattedDate,
        appointmentTime,
        doctorName,
      }
    });

    // Simulate Network Latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    logger.info('WhatsApp Notification Sent Successfully to %s. Content: "Hello %s, your registration at ASCAS has been approved! Your Patient ID is %s. Your appointment is confirmed with Dr. %s on %s at %s. Please show your ID at the front desk upon arrival."',
      phoneNumber, patientName, ascasPatientId, doctorName, formattedDate, appointmentTime
    );

    return {
      success: true,
      messageId: `wa_app_${Math.random().toString(36).substring(2, 11)}`,
    };
  } catch (error) {
    logger.error('WhatsApp approval hook failed for user %s: %s', patientName, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Mock service to send WhatsApp rejection message to the patient (slot unavailable).
 */
async function sendWhatsAppRejection(patientName, phoneNumber, remarks) {
  try {
    logger.info('WhatsApp Hook Triggered: Sending rejection notification message to %s...', phoneNumber, {
      meta: {
        to: phoneNumber,
        patientName,
        remarks,
      }
    });

    // Simulate Network Latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    logger.info('WhatsApp Notification Sent Successfully to %s. Content: "Hello %s, your recent ASCAS online registration is disapproved the requested slot. Reason: %s (Slot unavailable on this date/time). Please try scheduling for another date by re-submitting the form or contact our front desk directly."',
      phoneNumber, patientName, remarks
    );

    return {
      success: true,
      messageId: `wa_rej_${Math.random().toString(36).substring(2, 11)}`,
    };
  } catch (error) {
    logger.error('WhatsApp rejection hook failed for user %s: %s', patientName, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendWhatsAppConfirmation,
  sendWhatsAppRejection,
};
