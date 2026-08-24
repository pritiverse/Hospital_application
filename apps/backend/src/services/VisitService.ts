import prisma from '../lib/prisma';

/** Record a completed doctor visit with prescription and LLM patient summary. */
export const recordVisit = async (data: {
  appointmentId: string;
  doctorId: string; // for authorization check
  clinicalNotes: string;
  diagnosis?: string;
  followUpDate?: string;
  patientSummary?: string;
  prescription: Array<{
    medicineName: string;
    dosage: string;
    frequencyPerDay: number;
    durationDays: number;
    startDate?: string;
    instructions?: string;
  }>;
}) => {
  return prisma.$transaction(async (tx: any) => {
    // Verify appointment belongs to this doctor
    const appointment = await tx.appointment.findUnique({
      where: { id: data.appointmentId },
    });
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.doctorId !== data.doctorId) throw new Error('Unauthorized');

    // Create the visit
    const visit = await tx.visit.create({
      data: {
        appointmentId: data.appointmentId,
        clinicalNotes: data.clinicalNotes,
        diagnosis: data.diagnosis ?? null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        patientSummary: data.patientSummary ?? null,
        patientSummaryStatus: data.patientSummary ? 'SUCCESS' : 'PENDING',
      },
    });

    // Create prescription items and scheduled reminders
    for (const rx of data.prescription) {
      if (!rx.medicineName.trim()) continue;
      const startDate = rx.startDate ? new Date(rx.startDate) : new Date();
      const frequency = Math.max(1, rx.frequencyPerDay || 1);
      const duration = Math.max(1, rx.durationDays || 1);

      const item = await tx.prescriptionItem.create({
        data: {
          visitId: visit.id,
          medicineName: rx.medicineName,
          dosage: rx.dosage,
          frequencyPerDay: frequency,
          durationDays: duration,
          startDate,
          instructions: rx.instructions ?? null,
        },
      });

      // Generate medication reminders
      const hoursInterval = frequency > 1 ? Math.floor(12 / (frequency - 1)) : 0;
      for (let day = 0; day < duration; day++) {
        for (let dose = 0; dose < frequency; dose++) {
          const reminderTime = new Date(startDate);
          reminderTime.setDate(reminderTime.getDate() + day);
          reminderTime.setHours(8 + dose * hoursInterval, 0, 0, 0);

          await tx.medicationReminder.create({
            data: {
              prescriptionItemId: item.id,
              scheduledAt: reminderTime,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Mark appointment as COMPLETED
    await tx.appointment.update({
      where: { id: data.appointmentId },
      data: { status: 'COMPLETED', holdExpiresAt: null },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'VISIT_RECORDED',
        entityType: 'Visit',
        entityId: visit.id,
        metadata: { appointmentId: data.appointmentId, doctorId: data.doctorId },
      },
    });

    return visit;
  }, { maxWait: 10000, timeout: 20000 });
};
