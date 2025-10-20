import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  // Verificar que existe el header Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Unauthorized access attempt to ${req.path} from ${req.ip}`);
    res.status(401).json({
      error: 'No token provided',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Extraer el token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as {
      id: string;
      email: string;
      role: string;
    };

    // Añadir información del usuario al request
    req.user = decoded;

    // Inyectar headers para los microservicios downstream
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    logger.debug(`User authenticated: ${decoded.email} (${decoded.role}) - Path: ${req.path}`);
    
    // Pasar al siguiente middleware
    next();
  } catch (error) {
    // Manejar errores específicos de JWT
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`Token expired for ${req.path} from ${req.ip}`);
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`Invalid token for ${req.path} from ${req.ip}`);
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Error genérico
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};