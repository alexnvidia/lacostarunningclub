import { Response, NextFunction } from 'express';
import * as adminusersControllerService from './adminusersControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function listUsers(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminusersControllerService.listUsers(req.swagger.params, res, next);
}