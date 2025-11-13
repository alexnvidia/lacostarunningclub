import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

  // Verify presence of Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`Unauthorized access attempt to ${req.path} from ${req.ip}`);
    res.status(401).json({
      error: 'No token provided',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // extract token from header
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token and decode payload
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345'
    ) as {
      id: string;
      email: string;
      role: string;
    };

    // Add user info to request object
    req.user = decoded;

    console.debug(`User authenticated: ${decoded.email} (${decoded.role}) - Path: ${req.path}`);
    
    // go to next middleware/controller
    next();
  } catch (error) {
    // handling specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      console.warn(`Token expired for ${req.path} from ${req.ip}`);
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      console.warn(`Invalid token for ${req.path} from ${req.ip}`);
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // general error handling
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};
