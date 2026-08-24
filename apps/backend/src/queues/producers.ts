import { Queue } from 'bullmq';

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

let queue: Queue | null = null;
try {
  queue = new Queue('notifications', { connection: getRedisConnection() });
  queue.on('error', () => {
    // Gracefully absorb connection errors if Redis is not configured or starting up
  });
} catch (err: any) {
  console.warn(`[BullMQ] Warning: Could not initialize notifications queue: ${err.message}`);
}

export const notificationQueue = queue;

// Producers enqueue jobs without executing them. This decouples the booking flow
// from the slower, error-prone email/calendar tasks.
export const enqueueNotification = async (jobId: string) => {
  if (!notificationQueue) return;
  try {
    const enqueuePromise = notificationQueue.add('send', { jobId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 }
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 800));
    await Promise.race([enqueuePromise, timeoutPromise]);
  } catch (err: any) {
    // Soft-fail: notifications are stored in PostgreSQL table NotificationJob
  }
};



