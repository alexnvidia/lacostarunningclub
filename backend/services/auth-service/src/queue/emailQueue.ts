import Bull from 'bull';

// Configuration for Bull - without maxRetriesPerRequest
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Important for Bull
  enableReadyCheck: false,    // Important for Bull
};

// Create email queue
export const emailQueue = new Bull('email-queue', {
  redis: redisConfig,
});

// Queue configuration
emailQueue.on('error', (error) => {
  console.error('❌ Email queue error:', error);
});

emailQueue.on('waiting', (jobId) => {
  console.log(`📨 Email job ${jobId} is waiting`);
});

emailQueue.on('active', (job) => {
  console.log(`🔄 Processing email job ${job.id} to ${job.data.to}`);
});

emailQueue.on('completed', (job) => {
  console.log(`✅ Email job ${job.id} completed successfully`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err);
});

console.log('📬 Email queue initialized');
