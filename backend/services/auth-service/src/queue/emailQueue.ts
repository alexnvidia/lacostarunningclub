import Bull from 'bull';
import Redis from 'ioredis';

// Configuración para Bull - sin maxRetriesPerRequest
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Importante para Bull
  enableReadyCheck: false,    // Importante para Bull
};

// Crear cola de emails
export const emailQueue = new Bull('email-queue', {
  redis: redisConfig,
});

// Configuración de la cola
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
