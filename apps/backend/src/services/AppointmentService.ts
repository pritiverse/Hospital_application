import prisma from '../lib/prisma';
import { enqueueNotification } from '../queues/producers';
import { getDoctorSlots } from './DoctorService';

async function suggestAlternatives(doctorId: string, requestedDate: Date): Promise<string[]> {
  try {
    const dateStr = requestedDate.toISOString().slice(0, 10);
    const slots = await getDoctorSlots(doctorId, dateStr);
    const openSlots = slots.filter((s: any) => s.available && new Date(s.slotStart) > requestedDate);
    if (openSlots.length >= 3) {
      return openSlots.slice(0, 3).map((s: any) => s.slotStart);
    }
    const nextDay = new Date(requestedDate.getTime() + 86400000).toISOString().slice(0, 10);
    const nextSlots = await getDoctorSlots(doctorId, nextDay);
    const combined = [...openSlots, ...nextSlots.filter((s: any) => s.available)];
    return combined.slice(0, 3).map((s: any) => s.slotStart);
  } catch {
    return [];
  }
}

export const bookAppointment = async (
  patientId: string, 
  doctorId: string, 
  slotStart: Date, 
  idempotencyKey: string
) => {
  return prisma.$transaction(async (tx: any) => {
    // Idempotency check
    const existingIdem = await tx.appointment.findUnique({ where: { idempotencyKey } });
    if (existingIdem) return existingIdem;

    // Check if slot already exists in DB
    const existingSlot = await tx.appointment.findUnique({
      where: { doctor_slot_unique: { doctorId, slotStart } },
    });

    const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

    if (existingSlot) {
      const isExpiredHold = existingSlot.status === 'HELD' && existingSlot.holdExpiresAt && new Date(existingSlot.holdExpiresAt) < new Date();
      const isInactive = ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_LEAVE', 'EXPIRED', 'NO_SHOW', 'RESCHEDULED'].includes(existingSlot.status) || isExpiredHold;

      if (!isInactive) {
        // Slot is actively held or confirmed
        const alternatives = await suggestAlternatives(doctorId, slotStart);
        throw { code: 'SLOT_CONFLICT', message: 'Slot already booked', alternatives };
      }

      // Reuse the slot record with clean state
      const appt = await tx.appointment.update({
        where: { id: existingSlot.id },
        data: {
          patientId,
          slotEnd,
          status: 'HELD',
          holdExpiresAt: new Date(Date.now() + 5 * 60000),
          idempotencyKey,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'APPOINTMENT_HELD',
          entityType: 'Appointment',
          entityId: appt.id,
          metadata: { patientId, doctorId, slotStart: slotStart.toISOString() },
        },
      });

      return appt;
    }

    try {
      const appt = await tx.appointment.create({
        data: {
          patientId,
          doctorId,
          slotStart,
          slotEnd,
          status: 'HELD',
          holdExpiresAt: new Date(Date.now() + 5 * 60000),
          idempotencyKey,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'APPOINTMENT_HELD',
          entityType: 'Appointment',
          entityId: appt.id,
          metadata: { patientId, doctorId, slotStart: slotStart.toISOString() },
        },
      });

      return appt;
    } catch (e: any) {
      if (e.code === 'P2002') {
        const alternatives = await suggestAlternatives(doctorId, slotStart);
        throw { code: 'SLOT_CONFLICT', message: 'Slot already booked', alternatives };
      }
      throw e;
    }
  }, { maxWait: 10000, timeout: 20000 });
};

/**
 * Confirm a HELD appointment (transition HELD → CONFIRMED).
 */
export const confirmAppointment = async (appointmentId: string, patientId: string) => {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw new Error('Appointment not found');
  if (appt.patientId !== patientId) throw new Error('Unauthorized');
  if (appt.status !== 'HELD') throw new Error('Appointment is not in HELD state');

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CONFIRMED', holdExpiresAt: null },
  });

  // Create notification job
  const job = await prisma.notificationJob.create({
    data: {
      appointmentId,
      recipientId: patientId,
      type: 'BOOKING_CONFIRMED',
      channel: 'EMAIL',
      status: 'PENDING',
      nextAttemptAt: new Date(),
    },
  });
  await enqueueNotification(job.id);

  await prisma.auditLog.create({
    data: {
      action: 'APPOINTMENT_CONFIRMED',
      entityType: 'Appointment',
      entityId: appointmentId,
      metadata: { patientId },
    },
  });

  return updated;
};

/**
 * Get all appointments for a patient with full details.
 */
export const getPatientAppointments = async (patientId: string) => {
  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    orderBy: { slotStart: 'desc' },
    include: {
      doctor: {
        include: { user: { select: { name: true } } },
      },
      symptom: true,
      preVisitSummary: true,
      visit: {
        include: { prescriptionItems: true },
      },
    },
  });

  return appointments.map(mapAppointment);
};

/**
 * Get one appointment by ID (with auth check for patient ownership).
 */
export const getAppointmentById = async (id: string, patientId: string) => {
  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: { include: { user: { select: { name: true } } } },
      symptom: true,
      preVisitSummary: true,
      visit: { include: { prescriptionItems: true } },
    },
  });
  if (!appt) throw new Error('Appointment not found');
  if (appt.patientId !== patientId) throw new Error('Unauthorized');
  return mapAppointment(appt);
};

/**
 * Get today's appointment queue for a doctor.
 */
export const getDoctorTodayQueue = async (doctorId: string) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_LEAVE', 'EXPIRED', 'NO_SHOW'] },
    },
    orderBy: { slotStart: 'asc' },
    include: {
      patient: { include: { user: { select: { name: true } } } },
      symptom: true,
      preVisitSummary: true,
      visit: true,
    },
  });

  return appointments.map((appt) => ({
    id: appt.id,
    patient: appt.patient.user.name,
    patientId: appt.patientId,
    slotStart: appt.slotStart.toISOString(),
    time: formatTime(appt.slotStart),
    status: appt.status === 'COMPLETED' ? 'completed' : appt.status === 'CONFIRMED' ? 'current' : 'upcoming',
    symptoms: appt.symptom?.rawText ?? '',
    hasVisit: !!appt.visit,
    aiSummary: appt.preVisitSummary
      ? (() => {
          let missingInfo: string[] = [];
          try {
            if (appt.preVisitSummary.rawResponse) {
              const parsed = JSON.parse(appt.preVisitSummary.rawResponse);
              if (Array.isArray(parsed.missingInformation)) missingInfo = parsed.missingInformation;
            }
          } catch {}
          return {
            status: appt.preVisitSummary.status,
            urgency: appt.preVisitSummary.urgency,
            chiefComplaint: appt.preVisitSummary.chiefComplaint,
            suggestedQuestions: (appt.preVisitSummary.suggestedQuestions as string[]) || [],
            redFlags: (appt.preVisitSummary.redFlags as string[]) || [],
            missingInformation: missingInfo,
          };
        })()
      : { status: 'FAILED' },
  }));
};

/**
 * Cancel an appointment.
 */
export const cancelAppointment = async (appointmentId: string, patientId: string) => {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw new Error('Appointment not found');
  if (appt.patientId !== patientId) throw new Error('Unauthorized');

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED_BY_PATIENT' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appointmentId,
      metadata: { patientId, reason: 'PATIENT_INITIATED' },
    },
  });

  return updated;
};

/**
 * Reschedule an appointment: cancel old, create new HELD.
 */
export const rescheduleAppointment = async (
  appointmentId: string,
  patientId: string,
  newSlotStart: Date,
  idempotencyKey: string
) => {
  return prisma.$transaction(async (tx: any) => {
    const appt = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new Error('Appointment not found');
    if (appt.patientId !== patientId) throw new Error('Unauthorized');

    // Cancel old
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'RESCHEDULED' },
    });

    // Check if new slot already exists in DB
    const existingTargetSlot = await tx.appointment.findUnique({
      where: { doctor_slot_unique: { doctorId: appt.doctorId, slotStart: newSlotStart } },
    });

    const slotEnd = new Date(newSlotStart.getTime() + 30 * 60000);
    let newAppt: any;

    if (existingTargetSlot) {
      const isExpiredHold = existingTargetSlot.status === 'HELD' && existingTargetSlot.holdExpiresAt && new Date(existingTargetSlot.holdExpiresAt) < new Date();
      const isInactive = ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'CANCELLED_BY_LEAVE', 'EXPIRED', 'NO_SHOW', 'RESCHEDULED'].includes(existingTargetSlot.status) || isExpiredHold;

      if (!isInactive) {
        throw { code: 'SLOT_CONFLICT', message: 'Target reschedule slot is already booked' };
      }

      newAppt = await tx.appointment.update({
        where: { id: existingTargetSlot.id },
        data: {
          patientId,
          slotEnd,
          status: 'HELD',
          holdExpiresAt: new Date(Date.now() + 5 * 60000),
          idempotencyKey,
        },
      });
    } else {
      newAppt = await tx.appointment.create({
        data: {
          patientId,
          doctorId: appt.doctorId,
          slotStart: newSlotStart,
          slotEnd,
          status: 'HELD',
          holdExpiresAt: new Date(Date.now() + 5 * 60000),
          idempotencyKey,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: 'APPOINTMENT_RESCHEDULED',
        entityType: 'Appointment',
        entityId: appointmentId,
        metadata: { newAppointmentId: newAppt.id, patientId },
      },
    });

    return newAppt;
  }, { maxWait: 10000, timeout: 20000 });
};

/**
 * Get patient's notification history (from NotificationJobs linked to their appointments).
 */
export const getPatientNotifications = async (patientId: string) => {
  const jobs = await prisma.notificationJob.findMany({
    where: { appointment: { patientId } },
    include: {
      appointment: {
        include: {
          doctor: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return jobs.map((job) => ({
    id: job.id,
    read: job.status === 'SENT',
    type: job.type,
    message: buildNotificationMessage(job.type, job.appointment?.doctor?.user?.name),
    time: formatRelativeTime(job.createdAt),
    status: job.status,
    sentAt: job.sentAt?.toISOString() ?? null,
  }));
};

/** Update a doctor's working hours (replaces all existing). */
export const updateDoctorSchedule = async (doctorId: string, workingHours: Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}>) => {
  return prisma.$transaction(async (tx: any) => {
    // Delete existing
    await tx.doctorWorkingHours.deleteMany({ where: { doctorId } });
    // Create new
    for (const wh of workingHours) {
      await tx.doctorWorkingHours.create({
        data: { doctorId, dayOfWeek: wh.dayOfWeek, startTime: wh.startTime, endTime: wh.endTime },
      });
    }
    return { updated: workingHours.length };
  }, { maxWait: 10000, timeout: 20000 });
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatRelativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? 's' : ''} ago`;
  if (diffD === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildNotificationMessage(type: string, doctorName?: string): string {
  const doc = doctorName ?? 'your doctor';
  switch (type) {
    case 'BOOKING_CONFIRMED': return `Your appointment with ${doc} is confirmed.`;
    case 'REMINDER': return `Reminder: Your appointment with ${doc} is coming up.`;
    case 'CANCELLED': return `Your appointment with ${doc} has been cancelled.`;
    case 'LEAVE_AFFECTED': return `Your appointment with ${doc} was cancelled due to doctor leave.`;
    case 'RESCHEDULED': return `Your appointment with ${doc} has been rescheduled.`;
    default: return `Notification regarding your appointment with ${doc}.`;
  }
}

function mapAppointment(appt: any) {
  return {
    id: appt.id,
    doctor: appt.doctor.user.name,
    doctorId: appt.doctorId,
    specialization: appt.doctor.specialization,
    date: appt.slotStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: formatTime(appt.slotStart),
    slotStart: appt.slotStart.toISOString(),
    status: appt.status,
    calendarSync: appt.calendarSyncStatus,
    symptomsSubmitted: !!appt.symptom,
    confirmed: appt.status === 'CONFIRMED' || appt.status === 'COMPLETED',
    holdExpiresAt: appt.holdExpiresAt?.toISOString() ?? null,
    symptoms: appt.symptom?.rawText ?? null,
    severity: appt.symptom?.severity ?? null,
    durationDays: appt.symptom?.durationDays ?? null,
    aiSummary: appt.preVisitSummary
      ? (() => {
          let missingInfo: string[] = [];
          try {
            if (appt.preVisitSummary.rawResponse) {
              const parsed = JSON.parse(appt.preVisitSummary.rawResponse);
              if (Array.isArray(parsed.missingInformation)) missingInfo = parsed.missingInformation;
            }
          } catch {}
          return {
            status: appt.preVisitSummary.status,
            urgency: appt.preVisitSummary.urgency,
            chiefComplaint: appt.preVisitSummary.chiefComplaint,
            suggestedQuestions: (appt.preVisitSummary.suggestedQuestions as string[]) || [],
            redFlags: (appt.preVisitSummary.redFlags as string[]) || [],
            missingInformation: missingInfo,
          };
        })()
      : null,
    diagnosis: appt.visit?.diagnosis ?? null,
    followUpDate: appt.visit?.followUpDate ? appt.visit.followUpDate.toISOString() : null,
    postVisitSummary: appt.visit?.patientSummary ?? null,
    prescription: appt.visit?.prescriptionItems?.map((rx: any) => ({
      id: rx.id,
      medicine: rx.medicineName,
      dosage: rx.dosage,
      frequency: rx.frequencyPerDay === 1 ? 'Once daily' : rx.frequencyPerDay === 2 ? 'Twice daily' : `${rx.frequencyPerDay}x daily`,
      frequencyPerDay: rx.frequencyPerDay,
      duration: rx.durationDays,
      instructions: rx.instructions ?? '',
    })) ?? [],
    timeline: buildTimeline(appt),
  };
}

function buildTimeline(appt: any): Array<{ label: string; state: string; time: string | null }> {
  const tl = [];
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + formatTime(d);

  tl.push({ label: 'Appointment booked', state: 'done', time: fmt(appt.createdAt) });

  if (appt.symptom) {
    tl.push({ label: 'Symptoms submitted', state: 'done', time: fmt(appt.symptom.createdAt) });
  } else {
    tl.push({ label: 'Symptoms submitted', state: appt.status === 'HELD' ? 'pending' : 'pending', time: null });
  }

  if (appt.preVisitSummary?.status === 'SUCCESS') {
    tl.push({ label: 'AI pre-visit summary generated', state: 'done', time: appt.preVisitSummary.generatedAt ? fmt(appt.preVisitSummary.generatedAt) : null });
  } else if (appt.preVisitSummary) {
    tl.push({ label: 'AI pre-visit summary generated', state: 'failed', time: null });
  } else {
    tl.push({ label: 'AI pre-visit summary generated', state: 'pending', time: null });
  }

  const isConfirmed = ['CONFIRMED', 'COMPLETED', 'RESCHEDULED'].includes(appt.status);
  tl.push({ label: 'Confirmation email sent', state: isConfirmed ? 'done' : 'pending', time: isConfirmed ? fmt(appt.updatedAt) : null });
  tl.push({ label: 'Google Calendar synced', state: appt.calendarSyncStatus === 'SYNCED' ? 'done' : 'pending', time: null });

  const isCompleted = appt.status === 'COMPLETED';
  const isUpcoming = new Date(appt.slotStart) > new Date();
  tl.push({ label: 'Doctor consultation', state: isCompleted ? 'done' : isUpcoming ? 'active' : 'pending', time: fmt(appt.slotStart) });

  tl.push({ label: 'Post-visit summary', state: appt.visit?.patientSummary ? 'done' : 'pending', time: appt.visit?.createdAt ? fmt(appt.visit.createdAt) : null });
  tl.push({ label: 'Follow-up reminder', state: 'pending', time: null });

  return tl;
}
