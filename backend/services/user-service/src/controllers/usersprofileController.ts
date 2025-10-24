import { Response, NextFunction } from 'express';
import * as usersprofileControllerService from './usersprofileControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getProfile(req: SwaggerRequest, res: Response, next: NextFunction): void {
  usersprofileControllerService.getProfile(req.swagger.params, res, next);
}

export function updateProfile(req: SwaggerRequest, res: Response, next: NextFunction): void {
  usersprofileControllerService.updateProfile(req.swagger.params, res, next);
}