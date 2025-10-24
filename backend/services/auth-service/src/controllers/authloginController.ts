import { Response, NextFunction } from 'express';
import * as authloginControllerService from './authloginControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function loginUser(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authloginControllerService.loginUser(req.swagger.params, res, next);
}
