import { Response, NextFunction } from 'express';
import * as authregisterControllerService from './authregisterControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function registerUser(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authregisterControllerService.registerUser(req.swagger.params, res, next);
}