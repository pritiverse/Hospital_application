import prisma from '../lib/prisma';

/**
 * Returns all doctors with their user info and working hours.
 * Computes a rough "next available" string based on today's working hours.
 */
export const getDoctors = async () => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      workingHours: true,
    },
    orderBy: { user: { name: 'asc' } },
  });

  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun, 1=Mon, ...

  return doctors.map((doc) => {
    const todayHours = doc.workingHours.find((wh) => wh.dayOfWeek === todayDow);
    let nextAvailable: string;

    if (todayHours) {
      const [sh, sm] = todayHours.startTime.split(':').map(Number);
      const startToday = new Date(now);
      startToday.setHours(sh, sm, 0, 0);
      if (now < startToday) {
        nextAvailable = `Today, ${formatTime(todayHours.startTime)}`;
      } else {
        nextAvailable = findNextWorkingDay(doc.workingHours, todayDow);
      }
    } else {
      nextAvailable = findNextWorkingDay(doc.workingHours, todayDow);
    }

    return {
      id: doc.id,
      name: doc.user.name,
      email: doc.user.email,
      specialization: doc.specialization,
      slotDuration: doc.slotDurationMin,
      nextAvailable,
      workingHours: doc.workingHours.map((wh) => ({
        dayOfWeek: wh.dayOfWeek,
        startTime: wh.startTime,
        endTime: wh.endTime,
      })),
    };
  });
};

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function findNextWorkingDay(workingHours: { dayOfWeek: number; startTime: string }[], currentDow: number): string {
  for (let offset = 1; offset <= 7; offset++) {
    const dow = (currentDow + offset) % 7;
    const wh = workingHours.find((h) => h.dayOfWeek === dow);
    if (wh) {
      if (offset === 1) return `Tomorrow, ${formatTime(wh.startTime)}`;
      return `${DAY_NAMES[dow]}, ${formatTime(wh.startTime)}`;
    }
  }
  return 'Not available';
}

/**
 * Computes available time slots for a doctor on a given date.
 * Returns array of { time: "09:00 AM", slotStart: ISOString, available: boolean } objects.
 */
export const getDoctorSlots = async (doctorId: string, date: string) => {
  const d = new Date(date);
  const dow = d.getDay();

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { workingHours: true },
  });

  if (!doctor) throw new Error('Doctor not found');

  const workingHour = doctor.workingHours.find((wh) => wh.dayOfWeek === dow);
  if (!workingHour) return []; // Doctor not working on this day

  // Get existing appointments for this doctor on this date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Check if doctor has an active leave covering this date
  const leaves = await prisma.doctorLeave.findMany({
    where: {
      doctorId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });

  // Auto-expire stale holds
  await prisma.appointment.updateMany({
    where: {
      status: 'HELD',
      holdExpiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStart, lte: dayEnd },
      status: { in: ['CONFIRMED', 'COMPLETED', 'HELD'] },
    },
    select: { slotStart: true },
  });

  const bookedTimes = new Set(booked.map((a) => a.slotStart.toISOString()));

  const slots: { time: string; slotStart: string; available: boolean }[] = [];
  const [startH, startM] = workingHour.startTime.split(':').map(Number);
  const [endH, endM] = workingHour.endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let min = startMinutes; min < endMinutes; min += doctor.slotDurationMin) {
    const slotDate = new Date(date);
    const h = Math.floor(min / 60);
    const m = min % 60;
    slotDate.setHours(h, m, 0, 0);

    const isBooked = bookedTimes.has(slotDate.toISOString());
    const isPast = slotDate < new Date();

    // Check if slot falls within any doctor leave period
    const isOnLeave = leaves.some(
      (leave) => slotDate >= new Date(leave.startDate) && slotDate <= new Date(leave.endDate)
    );

    slots.push({
      time: formatTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
      slotStart: slotDate.toISOString(),
      available: !isBooked && !isPast && !isOnLeave,
    });
  }

  return slots;
};
