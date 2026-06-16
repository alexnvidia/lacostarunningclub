import winston from 'winston';
import dotenv from 'dotenv';

// Load env variables in case logger is imported before index.ts dotenv.config()
dotenv.config();

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports: winston.transport[] = [];

// Determine which transports to add based on env variables
if (process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

// Default to console logging if not explicitly disabled or if requested
if (process.env.LOG_TO_CONSOLE !== 'false') {
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? logFormat
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'api-gateway' },
  transports,
});

export default logger;