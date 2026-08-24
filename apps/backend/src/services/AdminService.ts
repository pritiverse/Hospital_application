import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import { enqueueNotification } from '../queues/producers';

/** Aggregated stats for the admin dashboard. */
export const getAdminStats = async () => {
  const [doctorCount, patientCount, todayVisitCount, pendingLeaveCount] = await Promise.all([
    prisma.doctor.count(),
    prisma.patient.count(),
    prisma.appointment.count({
      where: {
        slotStart: {
          gte: startOfDay(),
          lte: endOfDay(),
        },
        status: { in: ['COMPLETED', 'CONFIRMED', 'HELD'] },
      },
    }),
    prisma.doctorLeave.count({
      where: { startDate: { gte: new Date() } },
    }),
  ]);

  // Weekly appointments for the current week (Mon–Sun)
  const weekStart = getWeekStart();
  const weeklyRaw = await prisma.$queryRaw<{ dow: number; count: bigint }[]>`
    SELECT EXTRACT(DOW FROM "slotStart") AS dow, COUNT(*) AS count
    FROM "Appointment"
    WHERE "slotStart" >= ${weekStart}
      AND "slotStart" < ${new Date(weekStart.getTime() + 7 * 86400000)}
    GROUP BY dow
  `;

  const dayMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weeklyRaw.forEach((row) => {
    const name = dowNames[Number(row.dow)];
    if (name && dayMap[name] !== undefined) dayMap[name] = Number(row.count);
  });

  const weeklyAppointments = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

  // Notification health
  const [emailSent, emailRetry, emailFailed, calSynced, calPending, llmGenerated, llmFailed] = await Promise.all([
    prisma.notificationJob.count({ where: { status: 'SENT' } }),
    prisma.notificationJob.count({ where: { status: 'RETRY' } }),
    prisma.notificationJob.count({ where: { status: 'FAILED_PERMANENTLY' } }),
    prisma.appointment.count({ where: { calendarSyncStatus: 'SYNCED' } }),
    prisma.appointment.count({ where: { calendarSyncStatus: 'PENDING' } }),
    prisma.preVisitSummary.count({ where: { status: 'SUCCESS' } }),
    prisma.preVisitSummary.count({ where: { status: { in: ['FAILED', 'INVALID_SCHEMA'] } } }),
  ]);

  return {
    doctors: doctorCount,
    patients: patientCount,
    todayVisits: todayVisitCount,
    pendingLeaves: pendingLeaveCount,
    weeklyAppointments,
    notificationHealth: {
      email: { sent: emailSent, retrying: emailRetry, failed: emailFailed },
      calendar: { synced: calSynced, pending: calPending },
      llm: { generated: llmGenerated, failed: llmFailed },
    },
  };
};

/** Returns all doctors for the admin manage-doctors view. */
export const getAdminDoctors = async () => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      workingHours: true,
    },
    orderBy: { user: { name: 'asc' } },
  });
  return doctors.map((doc) => ({
    id: doc.id,
    name: doc.user.name,
    email: doc.user.email,
    specialization: doc.specialization,
    slotDuration: doc.slotDurationMin,
    workingHours: doc.workingHours.map((wh) => ({
      dayOfWeek: wh.dayOfWeek,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
  }));
};

/** Creates a new doctor user + doctor profile. */
export const createAdminDoctor = async (data: {
  name: string;
  email: string;
  specialization: string;
  slotDuration: number;
  password?: string;
}) => {
  const passwordHash = await bcrypt.hash(data.password || 'password', 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: 'DOCTOR',
      doctor: {
        create: {
          specialization: data.specialization,
          slotDurationMin: data.slotDuration,
          workingHours: {
            create: [1, 2, 3, 4, 5].map((dow) => ({
              dayOfWeek: dow,
              startTime: '09:00',
              endTime: '17:00',
            })),
          },
        },
      },
    },
    include: { doctor: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'DOCTOR_CREATED',
      entityType: 'Doctor',
      entityId: user.doctor!.id,
      metadata: { name: data.name, specialization: data.specialization },
    },
  });

  return { id: user.doctor!.id, name: user.name, email: user.email, specialization: data.specialization };
};

/** Returns all recorded doctor leaves. */
export const getAdminLeaves = async () => {
  const leaves = await prisma.doctorLeave.findMany({
    include: {
      doctor: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return leaves.map((leave) => ({
    id: leave.id,
    doctorId: leave.doctorId,
    doctorName: leave.doctor.user.name,
    startDate: leave.startDate.toISOString(),
    endDate: leave.endDate.toISOString(),
    reason: leave.reason,
    createdAt: leave.createdAt.toISOString(),
  }));
};

/** Preview which appointments would be affected by a new doctor leave. */
export const getLeaveConflicts = async (doctorId: string, startDate: string, endDate: string) => {
  const affected = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: new Date(startDate), lte: new Date(endDate) },
      status: { in: ['CONFIRMED', 'HELD'] },
    },
    include: {
      patient: { include: { user: { select: { name: true } } } },
    },
    orderBy: { slotStart: 'asc' },
  });

  return affected.map((appt) => ({
    id: appt.id,
    patient: appt.patient.user.name,
    slotStart: appt.slotStart.toISOString(),
    status: appt.status,
  }));
};

/** Creates a doctor leave, cancels all affected appointments, logs the action. */
export const createAdminLeave = async (data: {
  adminUserId: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) => {
  return prisma.$transaction(async (tx: any) => {
    const leave = await tx.doctorLeave.create({
      data: {
        doctorId: data.doctorId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason ?? null,
      },
    });

    const affected = await tx.appointment.findMany({
      where: {
        doctorId: data.doctorId,
        slotStart: { gte: new Date(data.startDate), lte: new Date(data.endDate) },
        status: { in: ['CONFIRMED', 'HELD'] },
      },
    });

    const createdJobs: string[] = [];
    for (const appt of affected) {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { status: 'CANCELLED_BY_LEAVE' },
      });
      const job = await tx.notificationJob.create({
        data: {
          appointmentId: appt.id,
          recipientId: appt.patientId,
          type: 'LEAVE_AFFECTED',
          channel: 'EMAIL',
          status: 'PENDING',
          nextAttemptAt: new Date(),
        },
      });
      createdJobs.push(job.id);
    }

    await tx.auditLog.create({
      data: {
        actorUserId: data.adminUserId,
        action: 'ADMIN_MARKED_DOCTOR_LEAVE',
        entityType: 'DoctorLeave',
        entityId: leave.id,
        metadata: { doctorId: data.doctorId, affectedCount: affected.length },
      },
    });

    for (const jobId of createdJobs) {
      enqueueNotification(jobId).catch(() => {});
    }

    return { leave, cancelledCount: affected.length };
  }, { maxWait: 10000, timeout: 20000 });
};

/** All notification jobs for the admin notification center. */
export const getAdminNotifications = async () => {
  const jobs = await prisma.notificationJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      appointment: {
        include: {
          patient: { include: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    recipient: job.appointment?.patient?.user?.name ?? job.recipientId,
    recipientEmail: job.appointment?.patient?.user?.email ?? null,
    type: job.type,
    channel: job.channel,
    status: job.status,
    attempts: job.attemptCount,
    lastError: job.lastError,
    sentAt: job.sentAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  }));
};

/** Full audit log for the admin audit view. */
export const getAdminAuditLog = async () => {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return entries.map((e) => ({
    id: e.id,
    timestamp: e.createdAt.toISOString(),
    actor: e.actorUserId ?? 'system',
    action: e.action,
    entity: e.entityType,
    entityId: e.entityId,
    metadata: e.metadata,
  }));
};

// Helpers
function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
