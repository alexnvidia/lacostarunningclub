import { Request,Response, NextFunction } from 'express';
import * as authresendVerificationemailControllerService from './authresendverificationemailControllerService';


export function resendVerificationEmail(req: Request, res: Response, next: NextFunction): void {
  authresendVerificationemailControllerService.resendVerificationEmail(req, res, next);
}