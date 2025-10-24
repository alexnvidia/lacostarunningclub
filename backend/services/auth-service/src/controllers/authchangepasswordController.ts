import { Response, NextFunction } from 'express';
import * as authchangepasswordControllerService from './authchangepasswordControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function changePassword(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authchangepasswordControllerService.changePassword(req.swagger.params, res, next);
}
