import { Response, NextFunction } from 'express';
import * as usersidControllerService from './usersidControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getUserById(req: SwaggerRequest, res: Response, next: NextFunction): void {
  usersidControllerService.getUserById(req.swagger.params, res, next);
}