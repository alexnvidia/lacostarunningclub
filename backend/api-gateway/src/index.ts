import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middlewares/auth.middleware';
import { rateLimitMiddleware, authRateLimiter } from './middlewares/rateLimit.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { errorHandler } from './middlewares/errorHandler';
import { proxyRequest } from './utils/proxy';
import { services } from './config/services.config';
import logger from './utils/logger';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Trust the first reverse proxy hop (required for Render and most cloud platforms).
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// because Render injects X-Forwarded-For but Express doesn't trust it by default.
app.set('trust proxy', 1);

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Middlewares globales
app.use(helmet());
// Only allow CORS for development; adjust for production as needed
// change '*' to specific origins in production and add whitelist logic if necessary
app.use(cors({
  origin: (origin, callback) => callback(null, origin || '*'),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// catch JSON parsing errors
app.use(
  (
    err: any,
    _req: Request,
    res: Response,
    next: NextFunction
  ): Response | void => {
    if (
      err instanceof SyntaxError &&
      (err as any).status === 400 &&
      'body' in err
    ) {
      return res.status(400).json({
        error: 'Bad Request',
        code: 'INVALID_JSON',
        message: 'Malformed JSON in request body'
      });
    }
    // Always call next in other routes, so the linter/compiler considers it covered
    return next(err);
  }
);
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

// Health check endpoints (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/services', async (_req: Request, res: Response) => {
  const healthChecks = await Promise.allSettled(
    Object.entries(services).map(async ([_key, service]) => {
      try {
        const response = await fetch(`${service.url}${service.healthCheck}`);
        const data = await response.json();
        return {
          service: service.name,
          status: 'healthy',
          data,
        };
      } catch (error) {
        return {
          service: service.name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  const results = healthChecks.map((result, index) => {
    const serviceName = Object.keys(services)[index];
    return result.status === 'fulfilled' ? result.value : {
      service: services[serviceName].name,
      status: 'unhealthy',
      error: 'Service check failed',
    };
  });

  res.json({
    gateway: 'ok',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limiting to all API routes
app.use(API_PREFIX, rateLimitMiddleware);

// Apply stricter rate limiting to auth routes
app.use(`${API_PREFIX}/auth/login`, authRateLimiter);
app.use(`${API_PREFIX}/auth/register`, authRateLimiter);

// Route handlers - Proxy to microservices
// Iterate over services and set up routes
Object.entries(services).forEach(([_key, service]) => {
  if (service.requiresAuth) {
    // protected route
    app.use(
      `${API_PREFIX}${service.prefix}`,
      authMiddleware,  // Apply auth middleware only for protected routes
      (req: Request, res: Response) => {
        proxyRequest(req, res, service.url);
      }
    );
    logger.info(`🔒 Protected route: ${API_PREFIX}${service.prefix}`);
  } else {
    // public route
    app.use(
      `${API_PREFIX}${service.prefix}`,
      (req: Request, res: Response) => {
        proxyRequest(req, res, service.url);
      }
    );
    logger.info(`🌐 Public route: ${API_PREFIX}${service.prefix}`);
  }
});

// 404 handler
app.use('*path', (req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Prefix: ${API_PREFIX}`);
  logger.info('Routes configured:');
  Object.entries(services).forEach(([_key, service]) => {
    const authStatus = service.requiresAuth ? '🔒 Protected' : '🌐 Public';
    logger.info(`  ${authStatus} - ${API_PREFIX}${service.prefix} -> ${service.url}`);
  });
});

export default app;