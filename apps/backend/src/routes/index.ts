import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { registerUser, loginUser, refreshUserToken } from '../services/UserService';
import { generatePreVisitSummary, generatePostVisitSummary } from '../services/LlmService';
import { getDoctors, getDoctorSlots } from '../services/DoctorService';
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  syncAppointmentToGoogleCalendar,
} from '../services/CalendarService';
import {
  bookAppointment,
  confirmAppointment,
  getPatientAppointments,
  getAppointmentById,
  getDoctorTodayQueue,
  cancelAppointment,
  rescheduleAppointment,
  getPatientNotifications,
  updateDoctorSchedule,
} from '../services/AppointmentService';
import {
  getAdminStats,
  getAdminDoctors,
  createAdminDoctor,
  getAdminLeaves,
  getLeaveConflicts,
  createAdminLeave,
  getAdminNotifications,
  getAdminAuditLog,
} from '../services/AdminService';
import { recordVisit } from '../services/VisitService';
import prisma from '../lib/prisma';


const router = Router();

// ── Auth Routes ──────────────────────────────────────────────────────────────

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const result = await registerUser(email, password, name, role);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    const result = await refreshUserToken(refreshToken);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});


// ── Doctor Routes ────────────────────────────────────────────────────────────

/** GET /api/doctors — list all doctors (no auth required for booking flow) */
router.get('/doctors', async (_req: Request, res: Response) => {
  try {
    const doctors = await getDoctors();
    res.json(doctors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/doctors/:id/slots?date=YYYY-MM-DD — available time slots */
router.get('/doctors/:id/slots', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }
    const slots = await getDoctorSlots(req.params.id, date);
    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Appointment Routes ───────────────────────────────────────────────────────

/** POST /api/appointments — book a slot (returns HELD appointment) */
router.post('/appointments', requireAuth, async (req: any, res: Response) => {
  try {
    const { doctorId, slotStart, idempotencyKey } = req.body;
    const user = req.user as any;

    // Get patientId from user
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });

    const appt = await bookAppointment(patient.id, doctorId, new Date(slotStart), idempotencyKey);
    res.json(appt);
  } catch (err: any) {
    if (err.code === 'SLOT_CONFLICT') return res.status(409).json(err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/appointments/:id/confirm — confirm a HELD appointment */
router.post('/appointments/:id/confirm', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const appt = await confirmAppointment(req.params.id, patient.id);
    res.json(appt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/appointments — patient's own appointments */
router.get('/appointments', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const appts = await getPatientAppointments(patient.id);
    res.json(appts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/appointments/today — doctor's today queue */
router.get('/appointments/today', requireAuth, requireRole('DOCTOR'), async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) return res.status(403).json({ error: 'Doctor profile not found' });
    const queue = await getDoctorTodayQueue(doctor.id);
    res.json(queue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/appointments/:id — single appointment details (patient owner) */
router.get('/appointments/:id', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const appt = await getAppointmentById(req.params.id, patient.id);
    res.json(appt);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

/** DELETE /api/appointments/:id — patient cancels */
router.delete('/appointments/:id', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const appt = await cancelAppointment(req.params.id, patient.id);
    res.json(appt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** PATCH /api/appointments/:id/reschedule — reschedule an appointment */
router.patch('/appointments/:id/reschedule', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const { newSlotStart, idempotencyKey } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const appt = await rescheduleAppointment(req.params.id, patient.id, new Date(newSlotStart), idempotencyKey);
    res.json(appt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/appointments/:id/symptoms — submit symptoms + trigger LLM (with IDOR ownership check) */
router.post('/appointments/:id/symptoms', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // IDOR ownership check
    if (user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient || appointment.patientId !== patient.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this appointment' });
      }
    }

    const { symptoms, severity, durationDays } = req.body;

    // Save symptom record
    await prisma.symptom.upsert({
      where: { appointmentId: req.params.id },
      create: {
        appointmentId: req.params.id,
        rawText: symptoms,
        severity: severity ?? null,
        durationDays: durationDays ? parseInt(durationDays) : null,
      },
      update: {
        rawText: symptoms,
        severity: severity ?? null,
        durationDays: durationDays ? parseInt(durationDays) : null,
      },
    });

    // Generate AI summary
    const summary = await generatePreVisitSummary(req.params.id, symptoms);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Visit Routes ─────────────────────────────────────────────────────────────

/** POST /api/visits — doctor records a completed visit */
router.post('/visits', requireAuth, requireRole('DOCTOR'), async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) return res.status(403).json({ error: 'Doctor profile not found' });

    const visit = await recordVisit({ ...req.body, doctorId: doctor.id });

    // If patientSummary was not provided, trigger async post-visit LLM summarization
    if (!req.body.patientSummary && req.body.clinicalNotes) {
      generatePostVisitSummary(visit.id, req.body.clinicalNotes, req.body.diagnosis).catch(() => {});
    }

    res.json(visit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/visits/:id/generate-summary — trigger post-visit LLM summary */
router.post('/visits/:id/generate-summary', requireAuth, requireRole('DOCTOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const visit = await prisma.visit.findUnique({ where: { id: req.params.id } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const summary = await generatePostVisitSummary(visit.id, visit.clinicalNotes, visit.diagnosis ?? undefined);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google Calendar Routes ───────────────────────────────────────────────────

/** GET /api/calendar/connect — returns or redirects to Google OAuth consent URL */
router.get('/calendar/connect', (_req: Request, res: Response) => {
  try {
    const url = getGoogleAuthUrl();
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/calendar/callback — handles Google OAuth redirect */
router.get('/calendar/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: 'Code query parameter missing' });

    const tokens = await exchangeGoogleCode(code);
    res.json({ success: true, tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/appointments/:id/calendar-sync — retry calendar sync */
router.post('/appointments/:id/calendar-sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await syncAppointmentToGoogleCalendar(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ── Notification Routes ───────────────────────────────────────────────────────

/** GET /api/notifications — patient's notifications */
router.get('/notifications', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });
    const notifs = await getPatientNotifications(patient.id);
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Doctor Profile Routes ─────────────────────────────────────────────────────

/** PUT /api/doctor/schedule — update working hours */
router.put('/doctor/schedule', requireAuth, requireRole('DOCTOR'), async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) return res.status(403).json({ error: 'Doctor profile not found' });
    const result = await updateDoctorSchedule(doctor.id, req.body.workingHours);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/doctor/leaves — doctor's own leaves */
router.get('/doctor/leaves', requireAuth, requireRole('DOCTOR'), async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) return res.status(403).json({ error: 'Doctor profile not found' });
    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: doctor.id },
      orderBy: { startDate: 'desc' },
    });
    res.json(leaves.map((l) => ({
      id: l.id,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      reason: l.reason,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Routes ──────────────────────────────────────────────────────────────

/** GET /api/admin/stats */
router.get('/admin/stats', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/doctors */
router.get('/admin/doctors', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const doctors = await getAdminDoctors();
    res.json(doctors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/doctors */
router.post('/admin/doctors', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, email, specialization, slotDuration, password } = req.body;
    const doctor = await createAdminDoctor({ name, email, specialization, slotDuration: parseInt(slotDuration || '30'), password });
    res.status(201).json(doctor);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/admin/leaves */
router.get('/admin/leaves', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const leaves = await getAdminLeaves();
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET or POST /api/admin/leaves/conflicts — preview affected appointments */
router.get('/admin/leaves/conflicts', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { doctorId, startDate, endDate } = req.query;
    if (!doctorId || !startDate || !endDate) {
      return res.status(400).json({ error: 'doctorId, startDate, endDate required' });
    }
    const conflicts = await getLeaveConflicts(String(doctorId), String(startDate), String(endDate));
    res.json(conflicts);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/leaves/conflicts', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { doctorId, startDate, endDate } = req.body;
    const conflicts = await getLeaveConflicts(doctorId, startDate, endDate);
    res.json(conflicts);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/admin/leaves */
router.post('/admin/leaves', requireAuth, requireRole('ADMIN'), async (req: any, res: Response) => {
  try {
    const user = req.user as any;
    const { doctorId, startDate, endDate, reason } = req.body;
    const result = await createAdminLeave({ adminUserId: user.id, doctorId, startDate, endDate, reason });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/admin/notifications */
router.get('/admin/notifications', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const jobs = await getAdminNotifications();
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/notifications/health */
router.get('/admin/notifications/health', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    res.json(stats.notificationHealth);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/audit */
router.get('/admin/audit', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const log = await getAdminAuditLog();
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Patient Health Timeline & Care Record ─────────────────────────────────────

/** GET /api/patient/timeline — Longitudinal care history */
router.get('/patient/timeline', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { slotStart: 'desc' },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        symptom: true,
        preVisitSummary: true,
        visit: {
          include: { prescriptionItems: true },
        },
      },
    });

    const events = appointments.map((appt) => ({
      id: appt.id,
      date: appt.slotStart.toISOString(),
      doctorName: appt.doctor.user.name,
      specialization: appt.doctor.specialization,
      status: appt.status,
      chiefComplaint: appt.symptom?.rawText || 'Routine consultation',
      diagnosis: appt.visit?.diagnosis || (appt.status === 'COMPLETED' ? 'Clinical evaluation completed' : null),
      patientSummary: appt.visit?.patientSummary || null,
      followUpDate: appt.visit?.followUpDate ? appt.visit.followUpDate.toISOString() : null,
      prescriptions: appt.visit?.prescriptionItems.map((p) => ({
        id: p.id,
        name: p.medicineName,
        dosage: p.dosage,
        frequency: p.frequencyPerDay === 1 ? 'Once daily' : p.frequencyPerDay === 2 ? 'Twice daily' : `${p.frequencyPerDay}x daily`,
        duration: `${p.durationDays} days`,
        instructions: p.instructions || '',
      })) || [],
    }));

    res.json({ events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Patient Medication Adherence Tracker ─────────────────────────────────────

/** GET /api/patient/medications — Active and historical medications with reminder status */
router.get('/patient/medications', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });

    const visits = await prisma.visit.findMany({
      where: {
        appointment: { patientId: patient.id },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
        prescriptionItems: {
          include: {
            reminders: {
              orderBy: { scheduledAt: 'asc' },
            },
          },
        },
      },
    });

    let totalDoses = 0;
    let takenCount = 0;
    let missedCount = 0;
    let pendingCount = 0;

    const medications = visits.flatMap((v) =>
      v.prescriptionItems.map((item) => {
        const itemReminders = item.reminders.map((r) => {
          totalDoses++;
          if (r.status === 'SENT') takenCount++;
          else if (r.status === 'FAILED') missedCount++;
          else pendingCount++;

          return {
            id: r.id,
            scheduledAt: r.scheduledAt.toISOString(),
            status: r.status, // PENDING | SENT | FAILED
            takenAt: r.sentAt ? r.sentAt.toISOString() : null,
          };
        });

        // Compute item-level adherence
        const itemTaken = item.reminders.filter((r) => r.status === 'SENT').length;
        const itemTotal = item.reminders.length;
        const itemAdherence = itemTotal > 0 ? Math.round((itemTaken / itemTotal) * 100) : 100;

        return {
          id: item.id,
          medicineName: item.medicineName,
          dosage: item.dosage,
          frequencyPerDay: item.frequencyPerDay,
          durationDays: item.durationDays,
          startDate: item.startDate.toISOString(),
          instructions: item.instructions || 'Take as directed with water',
          doctorName: v.appointment.doctor.user.name,
          adherenceRate: itemAdherence,
          reminders: itemReminders,
        };
      })
    );

    const overallAdherence = totalDoses > 0 ? Math.round((takenCount / (takenCount + missedCount || 1)) * 100) : 100;

    res.json({
      medications,
      adherenceStats: {
        totalDoses,
        taken: takenCount,
        missed: missedCount,
        pending: pendingCount,
        adherenceRate: overallAdherence,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/patient/medications/:id/adherence — Log a dose as TAKEN or MISSED */
router.patch('/patient/medications/:id/adherence', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (!patient) return res.status(403).json({ error: 'Patient profile not found' });

    const reminderId = req.params.id;
    const { status } = req.body; // 'SENT' (Taken) | 'FAILED' (Missed) | 'PENDING'

    const reminder = await prisma.medicationReminder.findUnique({
      where: { id: reminderId },
      include: {
        prescriptionItem: {
          include: {
            visit: {
              include: { appointment: true },
            },
          },
        },
      },
    });

    if (!reminder) return res.status(404).json({ error: 'Reminder dose not found' });
    if (reminder.prescriptionItem.visit.appointment.patientId !== patient.id) {
      return res.status(403).json({ error: 'Unauthorized to update this dose' });
    }

    const updated = await prisma.medicationReminder.update({
      where: { id: reminderId },
      data: {
        status: status === 'TAKEN' || status === 'SENT' ? 'SENT' : status === 'MISSED' || status === 'FAILED' ? 'FAILED' : 'PENDING',
        sentAt: status === 'TAKEN' || status === 'SENT' ? new Date() : null,
      },
    });

    res.json({ success: true, reminder: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Telemetry & Background Job Health ──────────────────────────────────

/** GET /api/admin/telemetry — Comprehensive system and background queue observability */
router.get('/admin/telemetry', requireAuth, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    // Email notification metrics
    const [emailPending, emailSent, emailRetry, emailFailed] = await Promise.all([
      prisma.notificationJob.count({ where: { status: 'PENDING' } }),
      prisma.notificationJob.count({ where: { status: 'SENT' } }),
      prisma.notificationJob.count({ where: { status: 'RETRY' } }),
      prisma.notificationJob.count({ where: { status: 'FAILED_PERMANENTLY' } }),
    ]);
    const emailTotal = emailPending + emailSent + emailRetry + emailFailed;

    // LLM health metrics
    const [llmSuccess, llmPending, llmInvalid, llmFailed] = await Promise.all([
      prisma.preVisitSummary.count({ where: { status: 'SUCCESS' } }),
      prisma.preVisitSummary.count({ where: { status: 'PENDING' } }),
      prisma.preVisitSummary.count({ where: { status: 'INVALID_SCHEMA' } }),
      prisma.preVisitSummary.count({ where: { status: 'FAILED' } }),
    ]);

    // Calendar sync metrics
    const [calSynced, calPending, calFailed] = await Promise.all([
      prisma.appointment.count({ where: { calendarSyncStatus: 'SYNCED' } }),
      prisma.appointment.count({ where: { calendarSyncStatus: 'PENDING' } }),
      prisma.appointment.count({ where: { calendarSyncStatus: 'FAILED' } }),
    ]);

    res.json({
      uptimeSeconds: Math.floor(process.uptime()),
      dbStatus: 'CONNECTED',
      queues: {
        email: {
          total: emailTotal,
          pending: emailPending,
          sent: emailSent,
          retrying: emailRetry,
          failed: emailFailed,
          healthScore: emailTotal > 0
            ? Math.round((emailSent / emailTotal) * 100)
            : 100,
        },
        calendarSync: {
          synced: calSynced,
          pending: calPending,
          failed: calFailed,
        },
        aiTriage: {
          success: llmSuccess,
          pending: llmPending,
          invalidSchema: llmInvalid,
          failed: llmFailed,
          successRate: (llmSuccess + llmInvalid + llmFailed) > 0
            ? Math.round((llmSuccess / (llmSuccess + llmInvalid + llmFailed)) * 100)
            : 100,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
