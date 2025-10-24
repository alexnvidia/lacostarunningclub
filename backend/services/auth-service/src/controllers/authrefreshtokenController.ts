import { Response, NextFunction } from 'express';
import * as authrefreshtokenControllerService from './authrefreshtokenControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function refreshToken(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authrefreshtokenControllerService.refreshToken(req.swagger.params, res, next);
}
