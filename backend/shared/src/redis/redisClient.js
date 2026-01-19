"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};
const redis = new ioredis_1.default(redisConfig);
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
exports.default = redis;
//# sourceMappingURL=redisClient.js.map