import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const notificationQueue = new Queue('notifications', { connection });

// Producers enqueue jobs without executing them. This decouples the booking flow
// from the slower, error-prone email/calendar tasks.
export const enqueueNotification = async (jobId: string) => {
  try {
    const enqueuePromise = notificationQueue.add('send', { jobId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 }
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 800));
    await Promise.race([enqueuePromise, timeoutPromise]);
  } catch (err: any) {
    console.warn(`[BullMQ] Warning: Could not enqueue notification ${jobId}: ${err.message}`);
  }
};


