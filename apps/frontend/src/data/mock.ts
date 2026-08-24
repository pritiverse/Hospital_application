export const mockDoctors = [
  {
    id: "d1",
    name: "Dr. Sarah Chen",
    specialization: "Cardiology",
    slotDuration: 30,
    nextAvailable: "Today, 2:30 PM",
    workingHours: [
      { day: "Mon", start: "09:00", end: "17:00" },
      { day: "Tue", start: "09:00", end: "17:00" },
      { day: "Wed", start: "09:00", end: "13:00" },
      { day: "Thu", start: "09:00", end: "17:00" },
      { day: "Fri", start: "09:00", end: "15:00" },
    ],
  },
  {
    id: "d2",
    name: "Dr. James Okafor",
    specialization: "Neurology",
    slotDuration: 45,
    nextAvailable: "Tomorrow, 10:00 AM",
    workingHours: [
      { day: "Mon", start: "10:00", end: "18:00" },
      { day: "Tue", start: "10:00", end: "18:00" },
      { day: "Thu", start: "10:00", end: "18:00" },
      { day: "Fri", start: "10:00", end: "16:00" },
    ],
  },
  {
    id: "d3",
    name: "Dr. Priya Nair",
    specialization: "Dermatology",
    slotDuration: 20,
    nextAvailable: "Aug 24, 11:15 AM",
    workingHours: [
      { day: "Mon", start: "08:00", end: "16:00" },
      { day: "Wed", start: "08:00", end: "16:00" },
      { day: "Fri", start: "08:00", end: "14:00" },
    ],
  },
  {
    id: "d4",
    name: "Dr. Marco Ricci",
    specialization: "Orthopedics",
    slotDuration: 30,
    nextAvailable: "Aug 25, 9:00 AM",
    workingHours: [
      { day: "Tue", start: "09:00", end: "17:00" },
      { day: "Wed", start: "09:00", end: "17:00" },
      { day: "Thu", start: "09:00", end: "17:00" },
    ],
  },
];

export const mockTimeSlots = [
  { time: "09:00 AM", available: true },
  { time: "09:30 AM", available: true },
  { time: "10:00 AM", available: false },
  { time: "10:30 AM", available: true },
  { time: "11:00 AM", available: true },
  { time: "11:30 AM", available: false },
  { time: "12:00 PM", available: false },
  { time: "02:00 PM", available: true },
  { time: "02:30 PM", available: true },
  { time: "03:00 PM", available: true },
  { time: "03:30 PM", available: false },
  { time: "04:00 PM", available: true },
  { time: "04:30 PM", available: true },
];

export const mockPatientAppointments = [
  {
    id: "a1",
    doctor: "Dr. Sarah Chen",
    specialization: "Cardiology",
    date: "Aug 24, 2026",
    time: "2:30 PM",
    status: "CONFIRMED",
    calendarSync: "SYNCED",
    symptomsSubmitted: true,
    confirmed: true,
    holdExpiresAt: null,
    timeline: [
      { label: "Appointment booked", state: "done", time: "Aug 20, 10:14 AM" },
      { label: "Symptoms submitted", state: "done", time: "Aug 20, 10:17 AM" },
      { label: "AI pre-visit summary generated", state: "done", time: "Aug 20, 10:17 AM" },
      { label: "Confirmation email sent", state: "done", time: "Aug 20, 10:18 AM" },
      { label: "Google Calendar synced", state: "done", time: "Aug 20, 10:19 AM" },
      { label: "Doctor consultation", state: "active", time: "Aug 24, 2:30 PM" },
      { label: "Post-visit summary", state: "pending", time: null },
      { label: "Follow-up reminder", state: "pending", time: null },
    ],
    aiSummary: {
      status: "SUCCESS",
      urgency: "Medium",
      chiefComplaint: "Recurring chest tightness during exertion, worsening over 3 weeks",
      suggestedQuestions: [
        "Can you describe how long each episode of tightness lasts?",
        "Have you noticed any associated shortness of breath or dizziness?",
        "Any family history of cardiac conditions?",
      ],
    },
    symptoms: "I've been experiencing tightness in my chest, especially when climbing stairs or walking fast. Started about 3 weeks ago. Mild at first but getting slightly worse.",
    severity: "Moderate",
    durationDays: 21,
  },
  {
    id: "a2",
    doctor: "Dr. Priya Nair",
    specialization: "Dermatology",
    date: "Aug 10, 2026",
    time: "11:15 AM",
    status: "COMPLETED",
    calendarSync: "SYNCED",
    symptomsSubmitted: true,
    confirmed: true,
    holdExpiresAt: null,
    timeline: [
      { label: "Appointment booked", state: "done", time: "Aug 5, 9:02 AM" },
      { label: "Symptoms submitted", state: "done", time: "Aug 5, 9:05 AM" },
      { label: "AI pre-visit summary generated", state: "done", time: "Aug 5, 9:05 AM" },
      { label: "Confirmation email sent", state: "done", time: "Aug 5, 9:06 AM" },
      { label: "Google Calendar synced", state: "done", time: "Aug 5, 9:07 AM" },
      { label: "Doctor consultation", state: "done", time: "Aug 10, 11:15 AM" },
      { label: "Post-visit summary", state: "done", time: "Aug 10, 12:01 PM" },
      { label: "Follow-up reminder", state: "done", time: "Aug 17, 9:00 AM" },
    ],
    aiSummary: {
      status: "SUCCESS",
      urgency: "Low",
      chiefComplaint: "Persistent dry patch on right forearm, mild itching",
      suggestedQuestions: [
        "When did you first notice the dry patch?",
        "Have you changed soaps, detergents, or skincare products recently?",
        "Does the itch worsen at night?",
      ],
    },
    postVisitSummary: "Your visit revealed a mild case of contact dermatitis. Avoid fragranced products on the affected area. Apply hydrocortisone 1% cream twice daily for 7 days. If no improvement in 2 weeks, book a follow-up.",
    prescription: [
      { medicine: "Hydrocortisone 1% Cream", dosage: "Apply topically", frequency: "Twice daily", duration: 7, instructions: "Apply to affected area only. Wash hands after use." },
      { medicine: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily", duration: 14, instructions: "Take at bedtime to reduce drowsiness." },
    ],
  },
  {
    id: "a3",
    doctor: "Dr. Marco Ricci",
    specialization: "Orthopedics",
    date: "Jul 15, 2026",
    time: "9:00 AM",
    status: "CANCELLED_BY_PATIENT",
    calendarSync: "FAILED",
    symptomsSubmitted: true,
    confirmed: false,
    holdExpiresAt: null,
    timeline: [],
    aiSummary: { status: "FAILED" },
  },
];

export const mockNotifications = [
  { id: "n1", read: false, type: "BOOKING_CONFIRMED", message: "Your appointment with Dr. Sarah Chen on Aug 24 at 2:30 PM is confirmed.", time: "2 hours ago" },
  { id: "n2", read: false, type: "REMINDER", message: "Medication reminder: Take Cetirizine 10mg tonight before bed.", time: "Yesterday, 8:00 PM" },
  { id: "n3", read: true, type: "APPOINTMENT_CHANGED", message: "Your appointment with Dr. Marco Ricci has been rescheduled to Aug 25 at 10:00 AM.", time: "Aug 18, 3:14 PM" },
  { id: "n4", read: true, type: "BOOKING_CONFIRMED", message: "Appointment with Dr. Priya Nair on Aug 10 is confirmed. Calendar invite sent.", time: "Aug 5, 9:06 AM" },
];

export const mockDoctorQueue = [
  {
    id: "q1",
    patient: "Alex Rivera",
    time: "9:00 AM",
    status: "completed",
    symptoms: "Lower back pain radiating to left leg for 2 months.",
    aiSummary: {
      status: "SUCCESS",
      urgency: "Medium",
      chiefComplaint: "Lumbar radiculopathy — lower back pain with left-leg radiation, 2-month duration",
      suggestedQuestions: [
        "Does the pain worsen with sitting or standing for extended periods?",
        "Any numbness or weakness in the leg?",
        "Have you had any imaging done for this issue previously?",
      ],
    },
  },
  {
    id: "q2",
    patient: "Mia Thompson",
    time: "9:45 AM",
    status: "current",
    symptoms: "Persistent headaches, nearly daily for the past 3 weeks.",
    aiSummary: {
      status: "SUCCESS",
      urgency: "Medium",
      chiefComplaint: "Chronic daily headache — bilateral, pressure-type, onset 3 weeks ago",
      suggestedQuestions: [
        "Are the headaches worse in the morning or evening?",
        "Any visual disturbances, nausea, or light sensitivity?",
        "Have you started any new medications or had significant life stressors recently?",
      ],
    },
  },
  {
    id: "q3",
    patient: "David Park",
    time: "10:30 AM",
    status: "upcoming",
    symptoms: "",
    aiSummary: { status: "FAILED" },
  },
  {
    id: "q4",
    patient: "Fatima Al-Hassan",
    time: "11:15 AM",
    status: "upcoming",
    symptoms: "Dizziness and palpitations when standing up suddenly.",
    aiSummary: {
      status: "SUCCESS",
      urgency: "High",
      chiefComplaint: "Orthostatic symptoms — dizziness and palpitations on postural change",
      suggestedQuestions: [
        "How long do the episodes last?",
        "Any recent dehydration, medication changes, or prolonged bed rest?",
        "Has the patient fainted or lost consciousness during any episode?",
      ],
    },
  },
];

export const mockAdminStats = {
  doctors: 24,
  patients: 1847,
  todayVisits: 38,
  pendingLeaves: 3,
  weeklyAppointments: [
    { day: "Mon", count: 42 },
    { day: "Tue", count: 38 },
    { day: "Wed", count: 51 },
    { day: "Thu", count: 45 },
    { day: "Fri", count: 29 },
    { day: "Sat", count: 12 },
    { day: "Sun", count: 0 },
  ],
  notificationHealth: {
    email: { sent: 1284, retrying: 3, failed: 1 },
    calendar: { synced: 642, pending: 4 },
    llm: { generated: 193, failed: 2 },
  },
};

export const mockAdminNotifications = [
  { id: "nj1", recipient: "Alex Rivera", type: "BOOKING_CONFIRMED", channel: "EMAIL", status: "SENT", attempts: 1, lastError: null, sentAt: "Aug 22, 10:18 AM" },
  { id: "nj2", recipient: "Mia Thompson", type: "REMINDER", channel: "EMAIL", status: "SENT", attempts: 1, lastError: null, sentAt: "Aug 22, 9:00 AM" },
  { id: "nj3", recipient: "David Park", type: "LEAVE_AFFECTED", channel: "EMAIL", status: "RETRY", attempts: 3, lastError: "Connection timeout — SMTP server unreachable", sentAt: null },
  { id: "nj4", recipient: "Fatima Al-Hassan", type: "CANCELLED", channel: "EMAIL", status: "RETRY", attempts: 2, lastError: "Rate limit exceeded (429)", sentAt: null },
  { id: "nj5", recipient: "James Wong", type: "BOOKING_CONFIRMED", channel: "EMAIL", status: "FAILED_PERMANENTLY", attempts: 5, lastError: "Invalid recipient address — bounce code 550", sentAt: null },
  { id: "nj6", recipient: "Lucia Fernandez", type: "RESCHEDULED", channel: "EMAIL", status: "SENT", attempts: 1, lastError: null, sentAt: "Aug 21, 3:42 PM" },
  { id: "nj7", recipient: "Omar Siddiqui", type: "BOOKING_CONFIRMED", channel: "EMAIL", status: "SENT", attempts: 2, lastError: null, sentAt: "Aug 21, 11:05 AM" },
  { id: "nj8", recipient: "Yuki Tanaka", type: "REMINDER", channel: "EMAIL", status: "SENT", attempts: 1, lastError: null, sentAt: "Aug 20, 8:00 AM" },
];

export const mockAuditLog = [
  { id: "al1", timestamp: "Aug 22, 2026 — 11:43 AM", actor: "admin@clinic.io", action: "ADMIN_MARKED_DOCTOR_LEAVE", entity: "DoctorLeave", entityId: "leave-009", metadata: { doctorId: "d2", affectedCount: 3 } },
  { id: "al2", timestamp: "Aug 22, 2026 — 11:43 AM", actor: "system", action: "LEAVE_CANCELLED_APPOINTMENTS", entity: "Appointment", entityId: "batch-003", metadata: { cancelledIds: ["a7","a8","a9"], notificationCount: 3 } },
  { id: "al3", timestamp: "Aug 22, 2026 — 10:17 AM", actor: "patient@email.com", action: "AI_SUMMARY_GENERATED", entity: "PreVisitSummary", entityId: "pv-021", metadata: { status: "SUCCESS", model: "gemini-1.5-flash", promptVersion: "previsit-v2" } },
  { id: "al4", timestamp: "Aug 21, 2026 — 3:41 PM", actor: "patient@email.com", action: "APPOINTMENT_RESCHEDULED", entity: "Appointment", entityId: "a6", metadata: { from: "Aug 22, 10:00", to: "Aug 25, 2:00" } },
  { id: "al5", timestamp: "Aug 21, 2026 — 2:05 PM", actor: "doctor@clinic.io", action: "VISIT_POST_SUMMARY_GENERATED", entity: "Visit", entityId: "v-012", metadata: { status: "SUCCESS", model: "gemini-1.5-flash" } },
  { id: "al6", timestamp: "Aug 20, 2026 — 9:06 AM", actor: "system", action: "NOTIFICATION_FAILED_PERMANENTLY", entity: "NotificationJob", entityId: "nj5", metadata: { recipient: "James Wong", attempts: 5 } },
  { id: "al7", timestamp: "Aug 20, 2026 — 9:02 AM", actor: "patient@email.com", action: "APPOINTMENT_CONFIRMED", entity: "Appointment", entityId: "a5", metadata: { doctorId: "d1", slotStart: "Aug 24, 2:30 PM" } },
  { id: "al8", timestamp: "Aug 19, 2026 — 4:22 PM", actor: "admin@clinic.io", action: "DOCTOR_CREATED", entity: "Doctor", entityId: "d4", metadata: { name: "Dr. Marco Ricci", specialization: "Orthopedics" } },
];

export const mockLeaveConflicts = [
  { patient: "Mia Thompson", time: "Aug 26, 9:45 AM", status: "CONFIRMED" },
  { patient: "David Park", time: "Aug 26, 10:30 AM", status: "CONFIRMED" },
  { patient: "Fatima Al-Hassan", time: "Aug 27, 2:00 PM", status: "HELD" },
];
