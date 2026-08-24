import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich database records...');
  const passwordHash = await bcrypt.hash('password', 10);

  // ── 1. PATIENTS ──────────────────────────────────────────────────────────
  const patientsData = [
    { email: 'patient@example.com', name: 'Sarah Mitchell', phone: '+1 555-0101' },
    { email: 'alex@example.com', name: 'Alex Rivera', phone: '+1 555-0102' },
    { email: 'mia@example.com', name: 'Mia Thompson', phone: '+1 555-0103' },
    { email: 'david@example.com', name: 'David Park', phone: '+1 555-0104' },
    { email: 'fatima@example.com', name: 'Fatima Al-Hassan', phone: '+1 555-0105' },
  ];

  const patientRecords: any[] = [];
  for (const p of patientsData) {
    let user = await prisma.user.findUnique({
      where: { email: p.email },
      include: { patient: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: p.email,
          name: p.name,
          passwordHash,
          role: Role.PATIENT,
          patient: {
            create: { phone: p.phone },
          },
        },
        include: { patient: true },
      });
    } else if (!user.patient) {
      const patient = await prisma.patient.create({
        data: { userId: user.id, phone: p.phone },
      });
      user.patient = patient;
    }
    if (user.patient) patientRecords.push(user.patient);
  }
  console.log(`Verified ${patientRecords.length} patient accounts.`);

  // ── 2. DOCTORS ───────────────────────────────────────────────────────────
  const doctorsData = [
    {
      email: 'doctor@example.com',
      name: 'Dr. Sarah Chen',
      specialization: 'Cardiology',
      slotDuration: 30,
      hours: [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: dow === 0 ? '13:00' : dow === 6 ? '15:00' : '17:00',
      })),
    },
    {
      email: 'okafor@clinic.io',
      name: 'Dr. James Okafor',
      specialization: 'Pediatrics',
      slotDuration: 30,
      hours: [1, 2, 3, 4, 5].map((dow) => ({
        dayOfWeek: dow,
        startTime: '08:30',
        endTime: dow === 5 ? '14:00' : '16:30',
      })),
    },
    {
      email: 'ricci@clinic.io',
      name: 'Dr. Marco Ricci',
      specialization: 'Dermatology',
      slotDuration: 30,
      hours: [1, 3, 5].map((dow) => ({
        dayOfWeek: dow,
        startTime: '10:00',
        endTime: '18:00',
      })),
    },
    {
      email: 'vargas@clinic.io',
      name: 'Dr. Elena Vargas',
      specialization: 'Neurology',
      slotDuration: 45,
      hours: [2, 4].map((dow) => ({
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: '17:00',
      })),
    },
  ];

  const doctorRecords: any[] = [];
  for (const d of doctorsData) {
    let user = await prisma.user.findUnique({
      where: { email: d.email },
      include: { doctor: { include: { workingHours: true } } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: d.email,
          name: d.name,
          passwordHash,
          role: Role.DOCTOR,
          doctor: {
            create: {
              specialization: d.specialization,
              slotDurationMin: d.slotDuration,
              workingHours: {
                create: d.hours,
              },
            },
          },
        },
        include: { doctor: { include: { workingHours: true } } },
      });
    } else if (!user.doctor) {
      const doc = await prisma.doctor.create({
        data: {
          userId: user.id,
          specialization: d.specialization,
          slotDurationMin: d.slotDuration,
          workingHours: {
            create: d.hours,
          },
        },
        include: { workingHours: true },
      });
      (user as any).doctor = doc;
    } else if (user && user.doctor && user.doctor.workingHours.length === 0) {
      const docId = user.doctor.id;
      await prisma.doctorWorkingHours.createMany({
        data: d.hours.map((h) => ({ ...h, doctorId: docId })),
      });
    }

    if (user && (user as any).doctor) doctorRecords.push((user as any).doctor);
  }
  console.log(`Verified ${doctorRecords.length} doctor profiles with working hours.`);

  // ── 3. ADMIN ─────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { name: 'Operations Admin' },
    create: {
      email: 'admin@example.com',
      name: 'Operations Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log('Verified admin account.');

  const sarahDoctor = doctorRecords.find((d) => d.specialization === 'Cardiology');
  const sarahPatient = patientRecords[0];
  const alexPatient = patientRecords[1];
  const miaPatient = patientRecords[2];

  if (sarahDoctor && sarahPatient && miaPatient) {
    const now = new Date();

    // Appt 1: Today at 09:00 AM (Mia Thompson - Completed Visit)
    const slot1Start = new Date(now);
    slot1Start.setHours(9, 0, 0, 0);
    const slot1End = new Date(slot1Start.getTime() + 30 * 60000);

    const existing1 = await prisma.appointment.findFirst({
      where: { doctorId: sarahDoctor.id, slotStart: slot1Start },
    });

    if (!existing1) {
      await prisma.appointment.create({
        data: {
          patientId: miaPatient.id,
          doctorId: sarahDoctor.id,
          slotStart: slot1Start,
          slotEnd: slot1End,
          status: 'COMPLETED',
          calendarSyncStatus: 'SYNCED',
          idempotencyKey: `seed-today-1-${slot1Start.toISOString()}`,
          symptom: {
            create: {
              rawText: 'Red rash on wrists and forearms after using new cosmetic lotion.',
              severity: 'Mild',
              durationDays: 4,
            },
          },
          preVisitSummary: {
            create: {
              urgency: 'Low',
              chiefComplaint: 'Patient presents with acute localized erythema on bilateral forearms.',
              suggestedQuestions: [
                'When did you first apply the cosmetic lotion?',
                'Have you had similar reactions to skincare products in the past?',
                'Are you experiencing itching, blistering, or systemic signs?',
              ],
              status: 'SUCCESS',
              promptVersion: 'previsit-v2',
              model: 'gemini-1.5-flash',
              generatedAt: new Date(),
            },
          },
          visit: {
            create: {
              clinicalNotes: 'Mild contact dermatitis on flexor surfaces. No secondary infection.',
              diagnosis: 'Contact Dermatitis (L23.9)',
              followUpDate: new Date(Date.now() + 14 * 86400000),
              patientSummary: 'Assessment indicates mild contact dermatitis triggered by cosmetic lotions. Prescribed hydrocortisone topical cream and oral antihistamine. Avoid scented skin products on the area.',
              patientSummaryStatus: 'SUCCESS',
              prescriptionItems: {
                create: [
                  {
                    medicineName: 'Hydrocortisone 1% Cream',
                    dosage: 'Apply thin layer',
                    frequencyPerDay: 2,
                    durationDays: 7,
                    startDate: new Date(),
                    instructions: 'Apply twice daily after washing with mild water.',
                  },
                  {
                    medicineName: 'Cetirizine 10mg',
                    dosage: '1 tablet',
                    frequencyPerDay: 1,
                    durationDays: 5,
                    startDate: new Date(),
                    instructions: 'Take once daily before bed if itching persists.',
                  },
                ],
              },
            },
          },
        },
      });
      console.log('Created completed visit appointment.');
    }

    // Appt 2: Today at 10:30 AM (Sarah Mitchell - Confirmed Upcoming)
    const slot2Start = new Date(now);
    slot2Start.setHours(10, 30, 0, 0);
    const slot2End = new Date(slot2Start.getTime() + 30 * 60000);

    const existing2 = await prisma.appointment.findFirst({
      where: { doctorId: sarahDoctor.id, slotStart: slot2Start },
    });

    if (!existing2) {
      await prisma.appointment.create({
        data: {
          patientId: sarahPatient.id,
          doctorId: sarahDoctor.id,
          slotStart: slot2Start,
          slotEnd: slot2End,
          status: 'CONFIRMED',
          calendarSyncStatus: 'SYNCED',
          idempotencyKey: `seed-today-2-${slot2Start.toISOString()}`,
          symptom: {
            create: {
              rawText: 'Recurring chest tightness during stair climbing, worsening over past 3 weeks.',
              severity: 'Moderate',
              durationDays: 21,
            },
          },
          preVisitSummary: {
            create: {
              urgency: 'Medium',
              chiefComplaint: 'Exertional chest tightness for three weeks with increasing frequency.',
              suggestedQuestions: [
                'Does the tightness radiate to your jaw, neck, or left arm?',
                'How long does it take for symptoms to subside once resting?',
                'Do you have any personal or family history of coronary artery disease?',
              ],
              status: 'SUCCESS',
              promptVersion: 'previsit-v2',
              model: 'gemini-1.5-flash',
              generatedAt: new Date(),
            },
          },
          notifications: {
            create: [
              {
                recipientId: sarahPatient.id,
                type: 'BOOKING_CONFIRMED',
                channel: 'EMAIL',
                status: 'SENT',
                sentAt: new Date(),
              },
            ],
          },
        },
      });
      console.log('Created upcoming confirmed appointment.');
    }

    // Appt 3: Past Completed Visit with Prescriptions
    const pastDate = new Date(Date.now() - 14 * 86400000);
    pastDate.setHours(11, 0, 0, 0);
    const pastEnd = new Date(pastDate.getTime() + 30 * 60000);

    const existingPast = await prisma.appointment.findFirst({
      where: { patientId: sarahPatient.id, status: 'COMPLETED' },
    });

    if (!existingPast) {
      await prisma.appointment.create({
        data: {
          patientId: sarahPatient.id,
          doctorId: sarahDoctor.id,
          slotStart: pastDate,
          slotEnd: pastEnd,
          status: 'COMPLETED',
          calendarSyncStatus: 'SYNCED',
          idempotencyKey: `seed-past-${pastDate.toISOString()}`,
          symptom: {
            create: {
              rawText: 'Elevated morning blood pressure readings averaging 145/92 mmHg.',
              severity: 'Mild',
              durationDays: 30,
            },
          },
          visit: {
            create: {
              clinicalNotes: 'Stage 1 essential hypertension confirmed across 3 outpatient readings. Advised dietary sodium reduction.',
              diagnosis: 'Essential Hypertension (I10)',
              followUpDate: new Date(Date.now() + 60 * 86400000),
              patientSummary: 'Diagnosis of Stage 1 Hypertension. Prescribed Lisinopril 10mg once daily in the morning. Continue daily home blood pressure log and follow up in 2 months.',
              patientSummaryStatus: 'SUCCESS',
              prescriptionItems: {
                create: [
                  {
                    medicineName: 'Lisinopril 10mg',
                    dosage: '1 tablet',
                    frequencyPerDay: 1,
                    durationDays: 30,
                    startDate: pastDate,
                    instructions: 'Take one tablet every morning with water.',
                  },
                  {
                    medicineName: 'Omega-3 Fish Oil 1000mg',
                    dosage: '1 softgel',
                    frequencyPerDay: 1,
                    durationDays: 60,
                    startDate: pastDate,
                    instructions: 'Take with food.',
                  },
                ],
              },
            },
          },
        },
      });
      console.log('Created past completed appointment with prescriptions.');
    }
  }

  // ── 4. NOTIFICATION JOBS & AUDIT ─────────────────────────────────────────
  const notifCount = await prisma.notificationJob.count();
  if (notifCount < 5 && sarahPatient) {
    await prisma.notificationJob.createMany({
      data: [
        { recipientId: sarahPatient.id, type: 'BOOKING_CONFIRMED', channel: 'EMAIL', status: 'SENT', sentAt: new Date() },
        { recipientId: sarahPatient.id, type: 'REMINDER', channel: 'EMAIL', status: 'SENT', sentAt: new Date(Date.now() - 3600000) },
        { recipientId: sarahPatient.id, type: 'REMINDER', channel: 'EMAIL', status: 'RETRY', attemptCount: 2, lastError: 'Rate limit exceeded on SMTP gateway' },
        { recipientId: sarahPatient.id, type: 'CANCELLED', channel: 'EMAIL', status: 'FAILED_PERMANENTLY', attemptCount: 5, lastError: 'Recipient mailbox unavailable' },
      ],
    });
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount < 5) {
    await prisma.auditLog.createMany({
      data: [
        { action: 'SYSTEM_INITIALIZED', entityType: 'System', entityId: 'care-sync-core', metadata: { version: '1.0.0' } },
        { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: sarahDoctor?.id || 'doc-1', metadata: { doctor: 'Dr. Sarah Chen', specialty: 'Cardiology' } },
        { action: 'APPOINTMENT_SCHEDULED', entityType: 'Appointment', entityId: 'seed-appt-1', metadata: { patient: 'Sarah Mitchell' } },
        { action: 'VISIT_RECORDED', entityType: 'Visit', entityId: 'seed-visit-1', metadata: { diagnosis: 'Contact Dermatitis' } },
      ],
    });
  }

  console.log('Database seeding finished completely!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
