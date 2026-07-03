const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { encrypt, decrypt, maskAadhaar } = require('../utils/cryptoHelper');
const { sendWhatsAppConfirmation, sendWhatsAppRejection } = require('../services/notificationService');

const prisma = new PrismaClient();

// List of doctors (Master Data)
const DOCTORS = [
  { id: 1, name: 'Dr. Robert Carter (Cardiology)' },
  { id: 2, name: 'Dr. Elena Rostova (Neurology)' },
  { id: 3, name: 'Dr. Marcus Vance (Pediatrics)' },
  { id: 4, name: 'Dr. Clara Oswald (General Medicine)' },
  { id: 5, name: 'Dr. Alistair Who (Orthopedics)' },
];

// List of visit types (Master Data)
const VISIT_TYPES = [
  'First Consultation',
  'Follow-up Visit',
  'Diagnostic Report Review',
  'Routine Check-up',
  'Emergency Consultation',
];

/**
 * Public Endpoint: GET /api/master/doctors
 */
async function getDoctors(req, res) {
  return res.json(DOCTORS);
}

/**
 * Public Endpoint: GET /api/master/visit-types
 */
async function getVisitTypes(req, res) {
  return res.json(VISIT_TYPES);
}

/**
 * Public Endpoint: GET /api/registration/form
 */
async function getFormMetadata(req, res) {
  return res.json({
    genders: ['MALE', 'FEMALE', 'OTHER'],
    visitTypes: VISIT_TYPES,
    doctors: DOCTORS,
  });
}

/**
 * Public Endpoint: POST /api/registration
 * Submits patient registration form and writes to tmp_patient_details with status 'PENDING'.
 */
async function submitRegistration(req, res) {
  const {
    name,
    dob,
    gender,
    phone,
    gov_id,
    purpose_of_visit,
    referral,
    appointment_date,
  } = req.body;

  try {
    // Encrypt Gov ID (Aadhaar) before storing
    const encryptedGovId = encrypt(gov_id);

    // Save temporary registration
    const tempRecord = await prisma.tmpPatientDetails.create({
      data: {
        name,
        dob: new Date(dob),
        gender,
        phone,
        gov_id: encryptedGovId,
        purpose_of_visit,
        referral: referral || null,
        registration_status: 'PENDING',
        appointment_date: new Date(appointment_date),
        source: 'QR_CODE',
      },
    });

    logger.info('New QR patient registration submitted. Temp ID: %s, Name: %s', tempRecord.tmp_id, name);

    // Return the record, but mask the Aadhaar for security in the response
    const safeResponse = {
      ...tempRecord,
      gov_id: maskAadhaar(gov_id),
    };

    return res.status(201).json({
      message: 'Registration submitted successfully. Pending review.',
      registration: safeResponse,
    });
  } catch (error) {
    logger.error('Failed to submit registration: %s', error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Internal Endpoint (JWT): GET /api/registration/pending
 * Fetches all PENDING registration records.
 */
async function getPendingRegistrations(req, res) {
  // Defensive limit: Enforce maximum pagination bounds to prevent database DoS
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 50);

  try {
    const pendingList = await prisma.tmpPatientDetails.findMany({
      where: { registration_status: 'PENDING' },
      orderBy: { submitted_at: 'desc' },
      take: limit,
    });

    // Decrypt and mask Aadhaar for each record in the list for receptionist UI
    const formattedList = pendingList.map((record) => {
      const decryptedAadhaar = decrypt(record.gov_id);
      return {
        ...record,
        gov_id: maskAadhaar(decryptedAadhaar),
      };
    });

    return res.json(formattedList);
  } catch (error) {
    logger.error('Failed to fetch pending registrations: %s', error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Internal Endpoint (JWT): POST /api/registration/approve/:tmp_id
 * Executes Single-Transaction Approval Logic:
 * 1. Validate data integrity
 * 2. Check for duplicate patient_details
 * 3. Generate unique ascas_patient_id (e.g. ASCAS000003)
 * 4. Copy approved record into patient_details (if not existing)
 * 5. Create appointment entry
 * 6. Update status of tmp_patient_details to APPROVED
 * 7. Trigger mock WhatsApp notification
 * 8. Write comprehensive audit log
 */
async function approveRegistration(req, res) {
  const { tmp_id } = req.params;
  const { doctor_name, visit_type, appointment_date, appointment_time, name, dob, gender, phone, remarks } = req.body;
  const receptionist = req.user.username;

  try {
    // Start atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch and validate temporary registration record exists and is PENDING
      const tempRecord = await tx.tmpPatientDetails.findUnique({
        where: { tmp_id },
      });

      if (!tempRecord) {
        throw new Error('Registration record not found');
      }

      if (tempRecord.registration_status !== 'PENDING') {
        throw new Error(`Record is already ${tempRecord.registration_status}`);
      }

      // Use updated values if provided in edit form, otherwise fallback to stored temporary values
      const finalName = name || tempRecord.name;
      const finalDob = dob ? new Date(dob) : tempRecord.dob;
      const finalGender = gender || tempRecord.gender;
      const finalPhone = phone || tempRecord.phone;
      const finalDoctor = doctor_name || 'Dr. Clara Oswald (General Medicine)';
      const finalVisitType = visit_type || 'First Consultation';
      const finalApptDate = appointment_date ? new Date(appointment_date) : tempRecord.appointment_date;

      // Decrypt the Government ID to get raw value
      const rawAadhaar = decrypt(tempRecord.gov_id);

      // 2. Check for duplicate records in patient_details by exact name, dob, and phone
      let patient = await tx.patientDetails.findFirst({
        where: {
          name: finalName,
          dob: finalDob,
          phone: finalPhone,
        },
      });

      let ascasPatientId = '';
      let isDuplicate = false;

      if (patient) {
        // Patient already exists, reuse existing ID
        ascasPatientId = patient.ascas_patient_id;
        isDuplicate = true;
        logger.info('Duplicate patient detected: %s. Reusing ID: %s', finalName, ascasPatientId);
      } else {
        // 3. Generate unique, non-repeating ascas_patient_id (format: ASCAS000001, etc.)
        const lastPatient = await tx.patientDetails.findFirst({
          where: {
            ascas_patient_id: {
              startsWith: 'ASCAS',
            },
          },
          orderBy: {
            ascas_patient_id: 'desc',
          },
        });

        let nextNum = 1;
        if (lastPatient) {
          const match = lastPatient.ascas_patient_id.match(/ASCAS(\d+)/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        
        ascasPatientId = `ASCAS${String(nextNum).padStart(6, '0')}`;

        // 4. Create record in patient_details using encrypted Aadhaar
        patient = await tx.patientDetails.create({
          data: {
            ascas_patient_id: ascasPatientId,
            name: finalName,
            dob: finalDob,
            gender: finalGender,
            phone: finalPhone,
            gov_id: encrypt(rawAadhaar), // Securely encrypt Aadhaar in master table
          },
        });
      }

      // 4.5 Check if the time slot is already booked for this doctor on this day (Double-booking prevention)
      const existingAppointment = await tx.appointment.findFirst({
        where: {
          doctor_name: finalDoctor,
          appointment_date: finalApptDate,
          appointment_time: appointment_time,
          status: 'SCHEDULED',
        },
      });

      if (existingAppointment) {
        const error = new Error(`The time slot ${appointment_time} is already allocated for ${finalDoctor} on this date. Please select another slot.`);
        error.statusCode = 400;
        throw error;
      }

      // 5. Create entry in appointments
      const appointment = await tx.appointment.create({
        data: {
          patient_id: patient.id,
          doctor_name: finalDoctor,
          appointment_date: finalApptDate,
          appointment_time: appointment_time,
          visit_type: finalVisitType,
          status: 'SCHEDULED',
        },
      });

      // 6. Update tmp_patient_details status to APPROVED
      const updatedTemp = await tx.tmpPatientDetails.update({
        where: { tmp_id },
        data: {
          registration_status: 'APPROVED',
          approved_at: new Date(),
          approved_by: receptionist,
          ascas_patient_id: ascasPatientId,
          remarks: remarks || 'Registration approved.',
          name: finalName,
          dob: finalDob,
          gender: finalGender,
          phone: finalPhone,
          appointment_date: finalApptDate,
        },
      });

      return {
        patient,
        appointment,
        updatedTemp,
        isDuplicate,
        rawAadhaar, // Return this for the whatsapp hook (will not be returned to frontend response)
      };
    });

    // 7. Write a comprehensive audit log using Winston Logger
    logger.info('AUDIT: Registration approved. Temp ID: %s -> Patient ID: %s. Handled by Receptionist: "%s". New Appointment ID: %d. Duplicate Patient: %s',
      tmp_id,
      result.patient.ascas_patient_id,
      receptionist,
      result.appointment.id,
      result.isDuplicate ? 'YES' : 'NO',
      {
        meta: {
          action: 'APPROVE_PATIENT',
          tempId: tmp_id,
          patientId: result.patient.id,
          ascasPatientId: result.patient.ascas_patient_id,
          appointmentId: result.appointment.id,
          receptionist,
          isDuplicate: result.isDuplicate,
        }
      }
    );

    // Outbound notification disabled as per request
    logger.info('Notification skipped: Confirmation SMS is disabled.');

    return res.json({
      message: result.isDuplicate
        ? 'Registration approved. Existing patient record linked successfully.'
        : 'Registration approved. New patient record created.',
      ascas_patient_id: result.patient.ascas_patient_id,
      appointment_id: result.appointment.id,
    });

  } catch (error) {
    logger.error('Failed to approve registration Temp ID %s: %s', tmp_id, error.stack);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message || 'Internal Server Error during approval' });
  }
}

/**
 * Internal Endpoint (JWT): POST /api/registration/reject/:tmp_id
 * Rejects a temporary patient registration record with receptionist remarks.
 */
async function rejectRegistration(req, res) {
  const { tmp_id } = req.params;
  const { remarks } = req.body;
  const receptionist = req.user.username;

  if (!remarks) {
    return res.status(400).json({ error: 'Rejection remarks are required' });
  }

  try {
    const tempRecord = await prisma.tmpPatientDetails.findUnique({
      where: { tmp_id },
    });

    if (!tempRecord) {
      return res.status(404).json({ error: 'Registration record not found' });
    }

    if (tempRecord.registration_status !== 'PENDING') {
      return res.status(400).json({ error: `Record is already ${tempRecord.registration_status}` });
    }

    const updatedRecord = await prisma.tmpPatientDetails.update({
      where: { tmp_id },
      data: {
        registration_status: 'REJECTED',
        remarks,
        approved_at: new Date(),
        approved_by: receptionist,
      },
    });

    logger.info('AUDIT: Registration rejected. Temp ID: %s. Reason: "%s". Handled by Receptionist: "%s"',
      tmp_id, remarks, receptionist, {
        meta: {
          action: 'REJECT_PATIENT',
          tempId: tmp_id,
          receptionist,
          remarks,
        }
      }
    );

    // Outbound notification disabled as per request
    logger.info('Notification skipped: Rejection SMS is disabled.');

    return res.json({
      message: 'Registration rejected successfully.',
      registration: {
        ...updatedRecord,
        gov_id: maskAadhaar(decrypt(updatedRecord.gov_id)),
      },
    });
  } catch (error) {
    logger.error('Failed to reject registration Temp ID %s: %s', tmp_id, error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  getDoctors,
  getVisitTypes,
  getFormMetadata,
  submitRegistration,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
};
