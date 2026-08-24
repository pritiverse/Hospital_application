import { z } from 'zod';

export const RoleEnum = z.enum(['PATIENT', 'DOCTOR', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

export const AppointmentStatusEnum = z.enum([
  'HELD',
  'CONFIRMED',
  'CANCELLED_BY_PATIENT',
  'CANCELLED_BY_DOCTOR',
  'CANCELLED_BY_LEAVE',
  'EXPIRED',
  'NO_SHOW',
  'RESCHEDULED',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;

export const PreVisitBriefSchema = z.object({
  urgency: z.enum(['Low', 'Medium', 'High']).nullable(),
  chiefComplaint: z.string().nullable(),
  suggestedQuestions: z.array(z.string()),
  redFlags: z.array(z.string()),
});
export type PreVisitBrief = z.infer<typeof PreVisitBriefSchema>;

export const PostVisitBriefSchema = z.object({
  summary: z.string(),
  medicationSchedule: z.array(
    z.object({
      medicine: z.string(),
      instructions: z.string(),
    })
  ),
  followUp: z.string().optional(),
});
export type PostVisitBrief = z.infer<typeof PostVisitBriefSchema>;
