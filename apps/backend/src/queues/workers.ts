import { Worker } from 'bullmq';
import prisma from '../lib/prisma';

const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const normalized = redisUrl.startsWith('https://')
        ? redisUrl.replace('https://', 'rediss://')
        : redisUrl;
      const url = new URL(normalized);
      const isTls = url.protocol === 'rediss:' || redisUrl.startsWith('https://');
      const password = url.password || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD || undefined;
      const username = url.username || (password ? 'default' : undefined);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        username,
        password,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // fallback to host/port
    }
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
    maxRetriesPerRequest: null,
  };
};

const connection = getRedisConnection();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function buildEmailHtml(type: string, details: any): { subject: string; html: string } {
  switch (type) {
    case 'BOOKING_CONFIRMED':
      return {
        subject: 'CareSync: Appointment Confirmed',
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563EB;">Appointment Confirmed</h2>
          <p>Your appointment has been confirmed.</p>
          <p><strong>Appointment ID:</strong> ${details.appointmentId || 'N/A'}</p>
          <p style="color: #64748B; font-size: 12px;">Thank you for using CareSync.</p>
        </div>`,
      };
    case 'LEAVE_AFFECTED':
      return {
        subject: 'CareSync Alert: Appointment Cancelled due to Doctor Leave',
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Important: Appointment Notice</h2>
          <p>Your scheduled appointment was cancelled because your doctor is scheduled on leave.</p>
          <p>Please log in to CareSync to reschedule at your convenience.</p>
        </div>`,
      };
    case 'RESCHEDULED':
      return {
        subject: 'CareSync: Appointment Rescheduled',
        html: `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563EB;">Appointment Rescheduled</h2>
          <p>Your appointment has been successfully rescheduled.</p>
        </div>`,
      };
    default:
      return {
        subject: 'CareSync Notification',
        html: `<p>You have a new update regarding your healthcare appointment.</p>`,
      };
  }
}

async function sendEmailViaResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_your_')) {
    console.log(`[Email Mock] Sending to ${to}: "${subject}"`);
    return { id: `mock_${Date.now()}` };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CareSync <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return res.json();
}

export const worker = new Worker('notifications', async (job) => {
  const { jobId } = job.data;
  console.log(`Processing notification job ${jobId}`);

  const record = await prisma.notificationJob.findUnique({
    where: { id: jobId },
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      },
    },
  });

  if (!record) throw new Error('Job record not found');

  await prisma.notificationJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } });

  try {
    const recipientEmail = record.appointment?.patient?.user?.email || 'patient@example.com';
    const emailData = buildEmailHtml(record.type, { appointmentId: record.appointmentId });

    await sendEmailViaResend(recipientEmail, emailData.subject, emailData.html);

    await prisma.notificationJob.update({
      where: { id: record.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (err: any) {
    await prisma.notificationJob.update({
      where: { id: record.id },
      data: { attemptCount: { increment: 1 }, lastError: err.message, status: 'RETRY' },
    });
    throw err;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', async (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    const { jobId } = job.data;
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: { status: 'FAILED_PERMANENTLY' },
    });
  }
});

worker.on('error', (err) => {
  console.warn(`[BullMQ Worker] Connection note: ${err.message}`);
});

console.log('CareSync Notification Worker is running...');

