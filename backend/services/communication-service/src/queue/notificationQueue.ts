import Bull from 'bull';
import { prisma } from '@lcrc/shared';

// Redis config (same pattern as auth-service emailQueue)
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for Bull
    enableReadyCheck: false,    // Required for Bull
};

export interface NotificationJobData {
    userId: string;
    title: string;
    message: string;
    type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'SUPPORT';
}

// Create notification queue
export const notificationQueue = new Bull<NotificationJobData>('notification-queue', {
    redis: redisConfig,
});

// Queue event listeners
notificationQueue.on('error', (error) => {
    console.error('❌ Notification queue error:', error);
});

notificationQueue.on('waiting', (jobId) => {
    console.log(`🔔 Notification job ${jobId} is waiting`);
});

notificationQueue.on('active', (job) => {
    console.log(`🔄 Processing notification job ${job.id} for user ${job.data.userId}`);
});

notificationQueue.on('completed', (job) => {
    console.log(`✅ Notification job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
    console.error(`❌ Notification job ${job?.id} failed:`, err);
});

// Worker: persist notification to DB
notificationQueue.process(async (job) => {
    const { userId, title, message, type } = job.data;

    await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            read: false,
        },
    });

    console.log(`📬 Notification saved for user ${userId}: ${title}`);
});

console.log('🔔 Notification queue initialized');
