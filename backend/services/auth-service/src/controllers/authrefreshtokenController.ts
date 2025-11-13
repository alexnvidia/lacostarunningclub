import { Request,Response, NextFunction } from 'express';
import * as authrefreshtokenControllerService from './authrefreshtokenControllerService.js';


export function refreshToken(req: Request, res: Response, next: NextFunction): void {
  authrefreshtokenControllerService.refreshToken(req, res, next);
}
