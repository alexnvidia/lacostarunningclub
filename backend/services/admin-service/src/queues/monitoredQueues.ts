import Bull from 'bull';

// Import your shared Redis client or use direct config if you prefer not to couple
// Assuming you have access to Redis environment variables in admin-service
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// IMPORTANT: The name 'email-queue' must be EXACTLY the same as in auth-service
export const emailQueue = new Bull('email-queue', {
  redis: redisConfig,
});

// If you had more queues in other services, instantiate them here too:
export const notificationQueue = new Bull('notification-queue', { redis: redisConfig });
