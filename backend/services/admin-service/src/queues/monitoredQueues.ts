import Bull from 'bull';

// Importa tu cliente Redis compartido o usa la config directa si prefieres no acoplar
// Asumiendo que tienes acceso a las variables de entorno de Redis en admin-service
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// IMPORTANTE: El nombre 'email-queue' debe ser EXACTAMENTE el mismo que en auth-service
export const emailQueue = new Bull('email-queue', {
  redis: redisConfig,
});

// Si tuvieras más colas en otros servicios, las instancias aquí también:
export const notificationQueue = new Bull('notification-queue', { redis: redisConfig });
