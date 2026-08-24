import { PrismaClient, Role, AppointmentStatus, SyncStatus, LlmStatus, ReminderStatus, JobStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 1. CLEARING ALL EXISTING DATABASE RECORDS...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Clear in reverse dependency order to prevent foreign key violations
  await prisma.medicationReminder.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.notificationJob.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorWorkingHours.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Database wiped clean.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 2. SEEDING USERS, PROFILES, AND SCHEDULES...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const passwordHash = await bcrypt.hash('password', 10);

  // ── 2.1 PATIENTS ──────────────────────────────────────────────────────────
  const patientsData = [
    { email: 'patient@example.com', name: 'Sarah Mitchell', phone: '+1 (555) 234-5678' },
    { email: 'alex@example.com', name: 'Alex Rivera', phone: '+1 (555) 345-6789' },
    { email: 'mia@example.com', name: 'Mia Thompson', phone: '+1 (555) 456-7890' },
    { email: 'david@example.com', name: 'David Park', phone: '+1 (555) 567-8901' },
    { email: 'fatima@example.com', name: 'Fatima Al-Hassan', phone: '+1 (555) 678-9012' },
    { email: 'robert@example.com', name: 'Robert Chen', phone: '+1 (555) 789-0123' },
  ];

  const patients: Record<string, any> = {};
  for (const p of patientsData) {
    const user = await prisma.user.create({
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
    patients[p.email] = user.patient;
  }
  console.log(`✓ Created ${Object.keys(patients).length} patient accounts.`);

  // ── 2.2 DOCTORS ───────────────────────────────────────────────────────────
  const doctorsData = [
    {
      email: 'doctor@example.com',
      name: 'Dr. Sarah Chen',
      specialization: 'Cardiology',
      slotDuration: 30,
      days: [0, 1, 2, 3, 4, 5, 6], // Full week
      startTime: '08:30',
      endTime: '17:00',
    },
    {
      email: 'okafor@clinic.io',
      name: 'Dr. James Okafor',
      specialization: 'Pediatrics',
      slotDuration: 30,
      days: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '16:30',
    },
    {
      email: 'ricci@clinic.io',
      name: 'Dr. Marco Ricci',
      specialization: 'Dermatology',
      slotDuration: 30,
      days: [1, 3, 5],
      startTime: '10:00',
      endTime: '18:00',
    },
    {
      email: 'vargas@clinic.io',
      name: 'Dr. Elena Vargas',
      specialization: 'Neurology',
      slotDuration: 30,
      days: [2, 4, 6],
      startTime: '09:00',
      endTime: '17:00',
    },
    {
      email: 'gupta@clinic.io',
      name: 'Dr. Ananya Gupta',
      specialization: 'General Practice',
      slotDuration: 30,
      days: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '16:00',
    },
  ];

  const doctors: Record<string, any> = {};
  for (const d of doctorsData) {
    const user = await prisma.user.create({
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
              create: d.days.map((dow) => ({
                dayOfWeek: dow,
                startTime: d.startTime,
                endTime: d.endTime,
              })),
            },
          },
        },
      },
      include: { doctor: true },
    });
    doctors[d.email] = user.doctor;
  }
  console.log(`✓ Created ${Object.keys(doctors).length} doctor profiles with working hours.`);

  // ── 2.3 ADMIN ─────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Operations Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log('✓ Created operations admin account.');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🩺 3. SEEDING REALISTIC MULTI-SCENARIO CLINICAL DATA...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const now = new Date();

  // Helper to make date times
  const makeTime = (baseDate: Date, hours: number, minutes: number) => {
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const drChen = doctors['doctor@example.com'];
  const drOkafor = doctors['okafor@clinic.io'];
  const drRicci = doctors['ricci@clinic.io'];
  const drVargas = doctors['vargas@clinic.io'];
  const drGupta = doctors['gupta@clinic.io'];

  const sarah = patients['patient@example.com'];
  const alex = patients['alex@example.com'];
  const mia = patients['mia@example.com'];
  const david = patients['david@example.com'];
  const fatima = patients['fatima@example.com'];
  const robert = patients['robert@example.com'];

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 1: Completed Historical Visit (Sarah Mitchell - Hypertension Care Plan)
  // ──────────────────────────────────────────────────────────────────────────
  const pastDate1 = new Date(now.getTime() - 21 * 86400000); // 3 weeks ago
  const slotPast1Start = makeTime(pastDate1, 10, 0);
  const slotPast1End = makeTime(pastDate1, 10, 30);

  const pastAppt1 = await prisma.appointment.create({
    data: {
      patientId: sarah.id,
      doctorId: drChen.id,
      slotStart: slotPast1Start,
      slotEnd: slotPast1End,
      status: AppointmentStatus.COMPLETED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-past-sarah-1`,
      symptom: {
        create: {
          rawText: 'Frequent morning occipital headaches and home BP readings exceeding 145/90 mmHg over the past month.',
          severity: 'Moderate',
          durationDays: 30,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Low',
          chiefComplaint: 'Symptomatic Stage 1 hypertension with recurring morning cephalalgia.',
          suggestedQuestions: [
            'How often are you checking your blood pressure at home?',
            'Are you experiencing any blurred vision, chest pain, or palpitations?',
            'Have you noticed excess sodium intake or heightened stress at work?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Low',
            chiefComplaint: 'Symptomatic Stage 1 hypertension with recurring morning cephalalgia.',
            missingInformation: [
              'Exact average morning vs evening blood pressure numbers',
              'Dietary sodium intake habits',
              'Family history of premature cardiovascular events',
            ],
            suggestedQuestions: [
              'How often are you checking your blood pressure at home?',
              'Are you experiencing any blurred vision or chest tightness?',
            ],
            redFlags: [],
          }),
          generatedAt: pastDate1,
        },
      },
      visit: {
        create: {
          clinicalNotes: 'Office BP 148/92 mmHg, repeat 144/90 mmHg. Heart sounds regular S1/S2, no murmurs. Diagnosis: Essential Stage 1 Hypertension. Initiated first-line pharmacotherapy with Lisinopril 10mg. Advised sodium restriction (<2g/day) and 30min daily aerobic activity.',
          diagnosis: 'Essential (primary) hypertension (ICD-10 I10)',
          followUpDate: new Date(now.getTime() + 45 * 86400000),
          patientSummary: 'Diagnosis of Stage 1 Essential Hypertension. We have started you on Lisinopril 10mg once daily every morning. Please take this with water. Maintain a twice-daily home blood pressure log. If you experience dry persistent cough or dizziness upon standing, contact our clinic.',
          patientSummaryStatus: LlmStatus.SUCCESS,
          prescriptionItems: {
            create: [
              {
                medicineName: 'Lisinopril',
                dosage: '10mg',
                frequencyPerDay: 1,
                durationDays: 30,
                startDate: pastDate1,
                instructions: 'Take 1 tablet every morning with a full glass of water.',
                reminders: {
                  create: [
                    // Yesterday dose: TAKEN
                    { scheduledAt: makeTime(new Date(now.getTime() - 86400000), 8, 0), status: ReminderStatus.SENT, sentAt: makeTime(new Date(now.getTime() - 86400000), 8, 1) },
                    // Today dose: TAKEN
                    { scheduledAt: makeTime(now, 8, 0), status: ReminderStatus.SENT, sentAt: makeTime(now, 8, 0) },
                    // Tomorrow dose: PENDING
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 8, 0), status: ReminderStatus.PENDING },
                    // Day after tomorrow: PENDING
                    { scheduledAt: makeTime(new Date(now.getTime() + 2 * 86400000), 8, 0), status: ReminderStatus.PENDING },
                  ],
                },
              },
              {
                medicineName: 'Omega-3 Fish Oil',
                dosage: '1000mg',
                frequencyPerDay: 1,
                durationDays: 60,
                startDate: pastDate1,
                instructions: 'Take 1 softgel daily with breakfast.',
                reminders: {
                  create: [
                    { scheduledAt: makeTime(new Date(now.getTime() - 86400000), 9, 0), status: ReminderStatus.SENT, sentAt: makeTime(new Date(now.getTime() - 86400000), 9, 0) },
                    { scheduledAt: makeTime(now, 9, 0), status: ReminderStatus.SENT, sentAt: makeTime(now, 9, 2) },
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 9, 0), status: ReminderStatus.PENDING },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 2: Today's Active Consultation Queue Item 1 (Sarah Mitchell with Dr. Sarah Chen)
  // ──────────────────────────────────────────────────────────────────────────
  const slotToday1Start = makeTime(now, 9, 30);
  const slotToday1End = makeTime(now, 10, 0);

  await prisma.appointment.create({
    data: {
      patientId: sarah.id,
      doctorId: drChen.id,
      slotStart: slotToday1Start,
      slotEnd: slotToday1End,
      status: AppointmentStatus.CONFIRMED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-today-sarah-2`,
      symptom: {
        create: {
          rawText: 'Exertional chest tightness and feeling of heart fluttering when climbing subway stairs, starting 10 days ago.',
          severity: 'Moderate',
          durationDays: 10,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Medium',
          chiefComplaint: 'Subacute exertional chest tightness and palpitations triggered by moderate stairs ascent.',
          suggestedQuestions: [
            'Does resting for 2–3 minutes completely resolve the chest tightness?',
            'Have you felt lightheadedness, nausea, or radiating discomfort down your left arm?',
            'How have your daily blood pressure readings been since starting Lisinopril?',
          ],
          redFlags: ['Exertional chest tightness in patient with diagnosed Stage 1 hypertension'],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Medium',
            chiefComplaint: 'Subacute exertional chest tightness and palpitations triggered by moderate stairs ascent.',
            missingInformation: [
              'Whether tightness radiates to jaw, neck, or left shoulder',
              'Exact duration of symptom recovery after stopping exertion',
              'Recent home blood pressure journal logs',
            ],
            suggestedQuestions: [
              'Does resting for 2–3 minutes completely resolve the chest tightness?',
              'Have you felt lightheadedness, nausea, or radiating discomfort down your left arm?',
              'How have your daily blood pressure readings been since starting Lisinopril?',
            ],
            redFlags: ['Exertional chest tightness in patient with diagnosed Stage 1 hypertension'],
          }),
          generatedAt: new Date(now.getTime() - 2 * 3600000),
        },
      },
      notifications: {
        create: [
          { recipientId: sarah.id, type: 'BOOKING_CONFIRMED', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 86400000) },
          { recipientId: sarah.id, type: 'REMINDER', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 3600000) },
        ],
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 3: Today's Queue Item 2 (Alex Rivera with Dr. Sarah Chen)
  // ──────────────────────────────────────────────────────────────────────────
  const slotToday2Start = makeTime(now, 11, 0);
  const slotToday2End = makeTime(now, 11, 30);

  await prisma.appointment.create({
    data: {
      patientId: alex.id,
      doctorId: drChen.id,
      slotStart: slotToday2Start,
      slotEnd: slotToday2End,
      status: AppointmentStatus.CONFIRMED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-today-alex-1`,
      symptom: {
        create: {
          rawText: 'Post-workout dizzy spells and fatigue after distance running.',
          severity: 'Mild',
          durationDays: 5,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Low',
          chiefComplaint: 'Post-exertional orthostatic lightheadedness and fatigue following distance runs.',
          suggestedQuestions: [
            'Are you hydrating adequately with electrolytes before and after running?',
            'Have you ever had a syncopal (fainting) episode?',
            'Do you experience chest pain or breathlessness during the run itself?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Low',
            chiefComplaint: 'Post-exertional orthostatic lightheadedness and fatigue following distance runs.',
            missingInformation: [
              'Daily fluid and electrolyte intake volumes',
              'Heart rate variability or smartwatch ECG logs',
            ],
            suggestedQuestions: [
              'Are you hydrating adequately with electrolytes before and after running?',
              'Have you ever had a syncopal episode?',
            ],
            redFlags: [],
          }),
          generatedAt: new Date(now.getTime() - 4 * 3600000),
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 4: Today's Queue Item 3 (Mia Thompson with Dr. Marco Ricci - Dermatology)
  // ──────────────────────────────────────────────────────────────────────────
  const slotToday3Start = makeTime(now, 14, 0);
  const slotToday3End = makeTime(now, 14, 30);

  await prisma.appointment.create({
    data: {
      patientId: mia.id,
      doctorId: drRicci.id,
      slotStart: slotToday3Start,
      slotEnd: slotToday3End,
      status: AppointmentStatus.CONFIRMED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-today-mia-dermatology`,
      symptom: {
        create: {
          rawText: 'Pruritic erythematous rash across inner elbows and wrists following new laundry detergent exposure.',
          severity: 'Moderate',
          durationDays: 4,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Low',
          chiefComplaint: 'Acute contact dermatitis with pruritic rash on bilateral flexor surfaces.',
          suggestedQuestions: [
            'Have you noticed any blistering, weeping, or secondary skin breakdown?',
            'Did you apply any over-the-counter hydrocortisone or soothing ointments?',
            'Do you have a personal history of atopic eczema or seasonal allergies?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Low',
            chiefComplaint: 'Acute contact dermatitis with pruritic rash on bilateral flexor surfaces.',
            missingInformation: [
              'Prior history of eczema or fragrance allergies',
              'Presence of mucosal or facial involvement',
            ],
            suggestedQuestions: [
              'Have you noticed any blistering or skin breakdown?',
              'Did you apply any over-the-counter hydrocortisone?',
            ],
            redFlags: [],
          }),
          generatedAt: new Date(now.getTime() - 1 * 3600000),
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 5: High-Urgency Emergency Triage Scenario (Robert Chen with Dr. Sarah Chen)
  // ──────────────────────────────────────────────────────────────────────────
  const slotToday4Start = makeTime(now, 15, 30);
  const slotToday4End = makeTime(now, 16, 0);

  await prisma.appointment.create({
    data: {
      patientId: robert.id,
      doctorId: drChen.id,
      slotStart: slotToday4Start,
      slotEnd: slotToday4End,
      status: AppointmentStatus.CONFIRMED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-today-robert-emergency`,
      symptom: {
        create: {
          rawText: 'Acute crushing pressure behind sternum, pain radiating to left jaw and shoulder, accompanied by sudden cold sweat and breathlessness for 45 minutes.',
          severity: 'Severe',
          durationDays: 1,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'High',
          chiefComplaint: 'Acute crushing retrosternal pain with left jaw/shoulder radiation and diaphoresis.',
          suggestedQuestions: [
            'Have you taken aspirin or sublingual nitroglycerin since symptom onset?',
            'Has 911 / emergency EMS been activated immediately?',
            'Do you have a previous history of coronary stent or angioplasty?',
          ],
          redFlags: [
            'POTENTIAL ACUTE CORONARY SYNDROME (ACS) / MYOCARDIAL INFARCTION — REQUIRES IMMEDIATE EMERGENCY DEPARTMENT EVALUATION',
          ],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'High',
            chiefComplaint: 'Acute crushing retrosternal pain with left jaw/shoulder radiation and diaphoresis.',
            missingInformation: [
              'Immediate 12-lead ECG availability',
              'Oxygen saturation level',
              'Time elapsed since peak pain intensity',
            ],
            suggestedQuestions: [
              'Have you taken aspirin or sublingual nitroglycerin?',
              'Has 911 / emergency services been called?',
            ],
            redFlags: [
              'POTENTIAL ACUTE CORONARY SYNDROME (ACS) / MYOCARDIAL INFARCTION — REQUIRES IMMEDIATE EMERGENCY DEPARTMENT EVALUATION',
            ],
          }),
          generatedAt: new Date(now.getTime() - 45 * 60000),
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 6: Completed Pediatrics Visit (David Park with Dr. James Okafor)
  // ──────────────────────────────────────────────────────────────────────────
  const pastDate2 = new Date(now.getTime() - 10 * 86400000); // 10 days ago
  const slotPast2Start = makeTime(pastDate2, 11, 0);
  const slotPast2End = makeTime(pastDate2, 11, 30);

  await prisma.appointment.create({
    data: {
      patientId: david.id,
      doctorId: drOkafor.id,
      slotStart: slotPast2Start,
      slotEnd: slotPast2End,
      status: AppointmentStatus.COMPLETED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-past-david-pediatrics`,
      symptom: {
        create: {
          rawText: 'Nocturnal dry cough and mild expiratory wheezing following spring outdoor sports.',
          severity: 'Moderate',
          durationDays: 7,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Low',
          chiefComplaint: 'Exertion- and allergen-triggered bronchospasm in 8-year-old child.',
          suggestedQuestions: [
            'Does David wake up coughing at night?',
            'Has he ever required emergency nebulizer therapy?',
            'Are there family members with asthma, eczema, or allergic rhinitis?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Low',
            chiefComplaint: 'Exertion- and allergen-triggered bronchospasm in 8-year-old child.',
            missingInformation: ['Peak expiratory flow baseline readings', 'Prior albuterol inhaler usage'],
            suggestedQuestions: ['Does David wake up coughing at night?', 'Has he ever required emergency nebulizer?'],
            redFlags: [],
          }),
          generatedAt: pastDate2,
        },
      },
      visit: {
        create: {
          clinicalNotes: 'Bilateral mild end-expiratory wheeze on auscultation. SpO2 98% on room air. Diagnosis: Mild Intermittent Allergic Asthma (J45.20). Prescribed Albuterol HFA inhaler with spacer device.',
          diagnosis: 'Mild Intermittent Asthma (ICD-10 J45.20)',
          followUpDate: new Date(now.getTime() + 30 * 86400000),
          patientSummary: 'David was evaluated for exercise-induced allergic cough. We prescribed an Albuterol inhaler to be used with a spacer 15 minutes prior to outdoor athletic activities. Keep the inhaler in his school sports bag.',
          patientSummaryStatus: LlmStatus.SUCCESS,
          prescriptionItems: {
            create: [
              {
                medicineName: 'Albuterol HFA Inhaler (90mcg/actuation)',
                dosage: '2 puffs',
                frequencyPerDay: 2,
                durationDays: 30,
                startDate: pastDate2,
                instructions: 'Inhale 2 puffs via spacer 15 minutes before sports or as needed for coughing.',
                reminders: {
                  create: [
                    { scheduledAt: makeTime(now, 8, 30), status: ReminderStatus.SENT, sentAt: makeTime(now, 8, 30) },
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 8, 30), status: ReminderStatus.PENDING },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 7: Completed Neurology Consultation (Mia Thompson with Dr. Elena Vargas)
  // ──────────────────────────────────────────────────────────────────────────
  const pastDate3 = new Date(now.getTime() - 14 * 86400000); // 2 weeks ago
  const slotPast3Start = makeTime(pastDate3, 14, 0);
  const slotPast3End = makeTime(pastDate3, 14, 45);

  await prisma.appointment.create({
    data: {
      patientId: mia.id,
      doctorId: drVargas.id,
      slotStart: slotPast3Start,
      slotEnd: slotPast3End,
      status: AppointmentStatus.COMPLETED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-past-mia-neurology`,
      symptom: {
        create: {
          rawText: 'Unilateral pulsating frontotemporal headache preceded by 20 minutes of zig-zag visual shimmer.',
          severity: 'Severe',
          durationDays: 2,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Medium',
          chiefComplaint: 'Classic migraine with scintillating visual aura.',
          suggestedQuestions: [
            'How frequently do these aura episodes occur each month?',
            'Do you experience photophobia, phonophobia, or nausea during the headache phase?',
            'What abortive analgesics have you tried with previous attacks?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Medium',
            chiefComplaint: 'Classic migraine with scintillating visual aura.',
            missingInformation: ['Monthly migraine attack frequency log', 'Response to over-the-counter NSAIDs'],
            suggestedQuestions: ['How frequently do these aura episodes occur each month?'],
            redFlags: [],
          }),
          generatedAt: pastDate3,
        },
      },
      visit: {
        create: {
          clinicalNotes: 'Neurological exam cranial nerves II-XII intact, motor 5/5, sensory intact, reflexes 2+ symmetrical. Diagnosis: Migraine with Aura (G43.109). Prescribed Sumatriptan 50mg for acute abortive therapy and daily prophylactic Magnesium Glycinate.',
          diagnosis: 'Migraine with Aura (ICD-10 G43.109)',
          followUpDate: new Date(now.getTime() + 60 * 86400000),
          patientSummary: 'Diagnosis confirmed as Migraine with Visual Aura. At the very first sign of visual disturbance (aura), take 1 Sumatriptan 50mg tablet. Rest in a dark, quiet room. Take Magnesium Glycinate 400mg every evening to reduce attack frequency.',
          patientSummaryStatus: LlmStatus.SUCCESS,
          prescriptionItems: {
            create: [
              {
                medicineName: 'Sumatriptan',
                dosage: '50mg',
                frequencyPerDay: 1,
                durationDays: 10,
                startDate: pastDate3,
                instructions: 'Take 1 tablet at initial onset of migraine aura with water.',
                reminders: {
                  create: [
                    { scheduledAt: makeTime(now, 20, 0), status: ReminderStatus.PENDING },
                  ],
                },
              },
              {
                medicineName: 'Magnesium Glycinate',
                dosage: '400mg',
                frequencyPerDay: 1,
                durationDays: 60,
                startDate: pastDate3,
                instructions: 'Take 1 capsule every night before sleeping.',
                reminders: {
                  create: [
                    { scheduledAt: makeTime(new Date(now.getTime() - 86400000), 21, 0), status: ReminderStatus.SENT, sentAt: makeTime(new Date(now.getTime() - 86400000), 21, 0) },
                    { scheduledAt: makeTime(now, 21, 0), status: ReminderStatus.SENT, sentAt: makeTime(now, 21, 1) },
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 21, 0), status: ReminderStatus.PENDING },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 8: Multi-System Chronic Care (Fatima Al-Hassan with Dr. Ananya Gupta)
  // ──────────────────────────────────────────────────────────────────────────
  const pastDate4 = new Date(now.getTime() - 28 * 86400000); // 4 weeks ago
  const slotPast4Start = makeTime(pastDate4, 9, 0);
  const slotPast4End = makeTime(pastDate4, 9, 30);

  await prisma.appointment.create({
    data: {
      patientId: fatima.id,
      doctorId: drGupta.id,
      slotStart: slotPast4Start,
      slotEnd: slotPast4End,
      status: AppointmentStatus.COMPLETED,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-past-fatima-gp`,
      symptom: {
        create: {
          rawText: 'Routine quarterly checkup for Type 2 Diabetes and bilateral distal foot tingling.',
          severity: 'Mild',
          durationDays: 90,
        },
      },
      preVisitSummary: {
        create: {
          urgency: 'Low',
          chiefComplaint: 'Quarterly glycemic review and early diabetic peripheral sensory check.',
          suggestedQuestions: [
            'What was your latest fasting blood glucose and HbA1c result?',
            'Are you performing daily visual inspection of your feet and toes?',
            'Have you had your annual dilated retinal eye exam this year?',
          ],
          redFlags: [],
          status: LlmStatus.SUCCESS,
          promptVersion: 'previsit-v3',
          model: 'gemini-1.5-flash',
          rawResponse: JSON.stringify({
            urgency: 'Low',
            chiefComplaint: 'Quarterly glycemic review and early diabetic peripheral sensory check.',
            missingInformation: ['Recent HbA1c lab value', 'Current Metformin daily dosage tolerance'],
            suggestedQuestions: ['What was your latest fasting blood glucose?'],
            redFlags: [],
          }),
          generatedAt: pastDate4,
        },
      },
      visit: {
        create: {
          clinicalNotes: 'HbA1c 6.9%. Monofilament sensory testing intact with mild reduction at bilateral great toes. Foot pulses intact. Diagnosis: Type 2 Diabetes without acute complication (E11.9). Continued Metformin 800mg BID.',
          diagnosis: 'Type 2 Diabetes Mellitus (ICD-10 E11.9)',
          followUpDate: new Date(now.getTime() + 90 * 86400000),
          patientSummary: 'Your quarterly diabetes check is on track with HbA1c at 6.9%. Continue taking Metformin 850mg twice daily with meals. Inspect your feet daily and wear cushioned footwear.',
          patientSummaryStatus: LlmStatus.SUCCESS,
          prescriptionItems: {
            create: [
              {
                medicineName: 'Metformin',
                dosage: '850mg',
                frequencyPerDay: 2,
                durationDays: 90,
                startDate: pastDate4,
                instructions: 'Take 1 tablet twice daily with morning and evening meals.',
                reminders: {
                  create: [
                    { scheduledAt: makeTime(now, 8, 0), status: ReminderStatus.SENT, sentAt: makeTime(now, 8, 5) },
                    { scheduledAt: makeTime(now, 19, 0), status: ReminderStatus.SENT, sentAt: makeTime(now, 19, 10) },
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 8, 0), status: ReminderStatus.PENDING },
                    { scheduledAt: makeTime(new Date(now.getTime() + 86400000), 19, 0), status: ReminderStatus.PENDING },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CASE 9: Cancelled Appointment Demonstration
  // ──────────────────────────────────────────────────────────────────────────
  const tomorrow = new Date(now.getTime() + 86400000);
  const slotTom1Start = makeTime(tomorrow, 10, 0);
  const slotTom1End = makeTime(tomorrow, 10, 30);

  await prisma.appointment.create({
    data: {
      patientId: alex.id,
      doctorId: drGupta.id,
      slotStart: slotTom1Start,
      slotEnd: slotTom1End,
      status: AppointmentStatus.CANCELLED_BY_PATIENT,
      calendarSyncStatus: SyncStatus.SYNCED,
      idempotencyKey: `seed-cancelled-alex`,
      symptom: {
        create: {
          rawText: 'Annual sports clearance physical exam.',
          severity: 'Mild',
          durationDays: 0,
        },
      },
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DOCTOR LEAVES
  // ──────────────────────────────────────────────────────────────────────────
  const leaveStart = new Date(now.getTime() + 7 * 86400000);
  const leaveEnd = new Date(now.getTime() + 9 * 86400000);
  await prisma.doctorLeave.create({
    data: {
      doctorId: drRicci.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: 'Annual Clinical Dermatology Symposium Attendance',
    },
  });
  console.log('✓ Created approved doctor leave schedule.');

  // ──────────────────────────────────────────────────────────────────────────
  // 4. BACKGROUND WORKER NOTIFICATIONS & AUDIT LOGS
  // ──────────────────────────────────────────────────────────────────────────
  await prisma.notificationJob.createMany({
    data: [
      { recipientId: sarah.id, type: 'BOOKING_CONFIRMED', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 24 * 3600000) },
      { recipientId: sarah.id, type: 'REMINDER', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 2 * 3600000) },
      { recipientId: alex.id, type: 'BOOKING_CONFIRMED', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 12 * 3600000) },
      { recipientId: mia.id, type: 'BOOKING_CONFIRMED', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 6 * 3600000) },
      { recipientId: david.id, type: 'REMINDER', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 30 * 60000) },
      { recipientId: fatima.id, type: 'REMINDER', channel: 'EMAIL', status: JobStatus.RETRY, attemptCount: 2, lastError: 'Temporary SMTP upstream delay' },
      { recipientId: alex.id, type: 'CANCELLED', channel: 'EMAIL', status: JobStatus.SENT, sentAt: new Date(now.getTime() - 5 * 3600000) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { action: 'SYSTEM_DATABASE_RESEEDED', entityType: 'System', entityId: 'care-sync-core', metadata: { dataset: 'comprehensive_clinical_v2', timestamp: now.toISOString() } },
      { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: drChen.id, metadata: { doctor: 'Dr. Sarah Chen', specialty: 'Cardiology' } },
      { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: drOkafor.id, metadata: { doctor: 'Dr. James Okafor', specialty: 'Pediatrics' } },
      { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: drRicci.id, metadata: { doctor: 'Dr. Marco Ricci', specialty: 'Dermatology' } },
      { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: drVargas.id, metadata: { doctor: 'Dr. Elena Vargas', specialty: 'Neurology' } },
      { action: 'DOCTOR_ONBOARDED', entityType: 'Doctor', entityId: drGupta.id, metadata: { doctor: 'Dr. Ananya Gupta', specialty: 'General Practice' } },
      { action: 'APPOINTMENT_SCHEDULED', entityType: 'Appointment', entityId: pastAppt1.id, metadata: { patient: 'Sarah Mitchell', doctor: 'Dr. Sarah Chen' } },
      { action: 'VISIT_RECORDED', entityType: 'Visit', entityId: 'visit-sarah-1', metadata: { diagnosis: 'Essential (primary) hypertension (ICD-10 I10)' } },
      { action: 'LEAVE_SUBMITTED', entityType: 'DoctorLeave', entityId: 'leave-ricci-1', metadata: { reason: 'Annual Clinical Dermatology Symposium Attendance' } },
    ],
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ DATABASE RESEEDING COMPLETE!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Patient Accounts:');
  console.log('   • patient@example.com (Sarah Mitchell) - Has upcoming Cardo appt + full timeline + Lisinopril adherence');
  console.log('   • alex@example.com    (Alex Rivera)    - Has today appt + cancelled appt');
  console.log('   • mia@example.com     (Mia Thompson)   - Has today Derm appt + Neurology migraine history');
  console.log('   • david@example.com   (David Park)     - Pediatric asthma care plan with Dr. Okafor');
  console.log('   • fatima@example.com  (Fatima Al-Hassan) - Type 2 Diabetes Metformin schedule');
  console.log('   • robert@example.com  (Robert Chen)    - Acute ACS emergency triage case');
  console.log('👨‍⚕️ Doctor Accounts:');
  console.log('   • doctor@example.com  (Dr. Sarah Chen) - Cardiology (Has Sarah Mitchell & Robert Chen in queue today)');
  console.log('   • okafor@clinic.io    (Dr. James Okafor) - Pediatrics');
  console.log('   • ricci@clinic.io     (Dr. Marco Ricci) - Dermatology (Has Mia Thompson today)');
  console.log('   • vargas@clinic.io    (Dr. Elena Vargas) - Neurology');
  console.log('   • gupta@clinic.io     (Dr. Ananya Gupta) - General Practice');
  console.log('🔑 Admin Account:');
  console.log('   • admin@example.com   (Operations Admin)');
  console.log('🔐 Password for all accounts: "password"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
