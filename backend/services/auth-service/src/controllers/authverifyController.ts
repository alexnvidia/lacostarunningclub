import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import * as authverifyControllerService from './authverifyControllerService';

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  authverifyControllerService.verifyToken(req, res, next);
}
