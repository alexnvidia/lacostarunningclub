import { Request,Response, NextFunction } from 'express';
import * as authloginControllerService from './authloginControllerService.js';


export function loginUser(req: Request, res: Response, next: NextFunction): void {
  authloginControllerService.loginUser(req, res, next);
}
