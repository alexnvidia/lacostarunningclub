import { Request, Response, NextFunction } from 'express';
import * as authverifyemailControllerService from './authverifyemailControllerService';

export function verifyEmail(req: Request, res: Response, next: NextFunction): void {
  authverifyemailControllerService.verifyEmail(req, res, next);
}
