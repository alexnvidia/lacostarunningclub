import { Request,Response, NextFunction } from 'express';
import * as authregisterControllerService from './authregisterControllerService.js';


export function registerUser(req: Request, res: Response, next: NextFunction): void {
  authregisterControllerService.registerUser(req, res, next);
}