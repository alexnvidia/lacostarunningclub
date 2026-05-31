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
  // Allow public access to uploaded assets (like avatars) 
  // since <img> tags don't send Authorization headers
  if (req.path.startsWith('/uploads/')) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Unauthorized access attempt to ${req.path} from ${req.ip}`);
    res.status(401).json({
      error: 'No token provided',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Extract the token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
      email: string;
      role: string;
    };

    // Add user information to the request
    req.user = decoded;

    // Inject headers for downstream microservices
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    logger.debug(`User authenticated: ${decoded.email} (${decoded.role}) - Path: ${req.path}`);

    // go to next middleware
    next();
  } catch (error) {
    // Handle JWT errors
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

    // Generic Error
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};