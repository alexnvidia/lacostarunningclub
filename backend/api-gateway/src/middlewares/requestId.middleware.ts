import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // If request-id is already present in headers, use it; otherwise generate a new one
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Attach to request headers so other middleware/handlers can access it
  req.headers['x-request-id'] = requestId;

  // Set the response header
  res.setHeader('x-request-id', requestId);

  next();
};
