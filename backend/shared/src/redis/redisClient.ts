import Redis from 'ioredis';

// configuration for Redis client
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // Not include maxRetriesPerRequest here - Bull will handle retries
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Client Redis singleton
const redis = new Redis(redisConfig);

// Event handlers for logging connection status
redis.on('connect', () => {
  console.log('✅ Redis client connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis client ready to accept commands');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis client reconnecting...');
});

export default redis;
