const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records
  await prisma.appointment.deleteMany({});
  await prisma.patientDetails.deleteMany({});
  await prisma.tmpPatientDetails.deleteMany({});
  await prisma.staffUser.deleteMany({});

  // 2. Create staff users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.staffUser.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: 'Sarah Jenkins',
      role: 'ADMIN',
    },
  });
  console.log('Created admin staff user:', admin.username);

  const receptionist = await prisma.staffUser.create({
    data: {
      username: 'receptionist',
      password: hashedPassword,
      name: 'John Smith',
      role: 'RECEPTIONIST',
    },
  });
  console.log('Created receptionist staff user:', receptionist.username);

  // 3. Create some existing approved patients (to test ascas_patient_id sequence generation)
  const patient1 = await prisma.patientDetails.create({
    data: {
      ascas_patient_id: 'ASCAS000001',
      name: 'John Doe',
      dob: new Date('1990-05-15'),
      gender: 'MALE',
      phone: '9876543210',
      gov_id: 'AES_ENCRYPTED_PLACEHOLDER_1', // mocked encrypted Aadhaar
    },
  });

  const patient2 = await prisma.patientDetails.create({
    data: {
      ascas_patient_id: 'ASCAS000002',
      name: 'Jane Smith',
      dob: new Date('1985-08-22'),
      gender: 'FEMALE',
      phone: '8765432109',
      gov_id: 'AES_ENCRYPTED_PLACEHOLDER_2',
    },
  });
  console.log('Created approved patients: ASCAS000001, ASCAS000002');

  // Create appointments for them
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_name: 'Dr. Robert Carter (Cardiology)',
      appointment_date: new Date('2026-07-02T10:00:00Z'),
      visit_type: 'Consultation',
      status: 'SCHEDULED',
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient2.id,
      doctor_name: 'Dr. Elena Rostova (Neurology)',
      appointment_date: new Date('2026-07-02T11:30:00Z'),
      visit_type: 'Follow-up',
      status: 'SCHEDULED',
    },
  });

  // 4. Create some pending/rejected temporary registrations
  await prisma.tmpPatientDetails.create({
    data: {
      name: 'Alice Johnson',
      dob: new Date('1995-12-05'),
      gender: 'FEMALE',
      phone: '7654321098',
      gov_id: '123456789012', // Store raw or encrypted depending on model, let's store encrypted/raw
      purpose_of_visit: 'Severe headache and migraine symptoms.',
      referral: 'Self-referred',
      registration_status: 'PENDING',
      appointment_date: new Date('2026-07-03T09:00:00Z'),
      source: 'QR_CODE',
    },
  });

  await prisma.tmpPatientDetails.create({
    data: {
      name: 'Michael Brown',
      dob: new Date('1978-03-10'),
      gender: 'MALE',
      phone: '6543210987',
      gov_id: '987654321098',
      purpose_of_visit: 'Routine annual check-up.',
      referral: 'Dr. James Smith',
      registration_status: 'PENDING',
      appointment_date: new Date('2026-07-03T10:30:00Z'),
      source: 'QR_CODE',
    },
  });

  await prisma.tmpPatientDetails.create({
    data: {
      name: 'David Wilson',
      dob: new Date('2002-11-20'),
      gender: 'MALE',
      phone: '5432109876',
      gov_id: '111122223333',
      purpose_of_visit: 'Sprained wrist from sports activity.',
      referral: '',
      registration_status: 'REJECTED',
      appointment_date: new Date('2026-06-30T14:00:00Z'),
      remarks: 'Invalid mobile phone contact number and duplicate name.',
      source: 'QR_CODE',
      approved_by: 'admin',
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
