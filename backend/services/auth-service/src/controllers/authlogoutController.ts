import { Response, NextFunction } from 'express';
import * as authlogoutControllerService from './authlogoutControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function logoutUser(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authlogoutControllerService.logoutUser(req.swagger.params, res, next);
}
