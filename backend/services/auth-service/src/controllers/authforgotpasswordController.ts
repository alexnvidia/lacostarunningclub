import { Request, Response, NextFunction } from 'express';
import * as authforgotpasswordControllerService from './authforgotpasswordControllerService.js';

export function forgotPassword(req: Request, res: Response, next: NextFunction): void {
  authforgotpasswordControllerService.forgotPassword(req, res, next);
}
