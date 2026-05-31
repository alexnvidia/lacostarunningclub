import { Request, Response, NextFunction } from 'express';
import * as authresetpasswordControllerService from './authresetpasswordControllerService.js';

export function resetPassword(req: Request, res: Response, next: NextFunction): void {
  authresetpasswordControllerService.resetPassword(req, res, next);
}
