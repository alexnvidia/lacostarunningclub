import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import * as authchangepasswordControllerService from './authchangepasswordControllerService.js';


export function changePassword(req: AuthRequest, res: Response, next: NextFunction): void {
  authchangepasswordControllerService.changePassword(req, res, next);
}
