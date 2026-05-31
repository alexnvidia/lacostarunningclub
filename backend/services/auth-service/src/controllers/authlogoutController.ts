import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import * as authlogoutControllerService from './authlogoutControllerService.js';

export function logoutUser(req: AuthRequest, res: Response, next: NextFunction): void {
  authlogoutControllerService.logoutUser(req, res, next);
}
