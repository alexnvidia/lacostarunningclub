import { Response, NextFunction } from 'express';
import * as authverifyControllerService from './authverifyControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function verifyToken(req: SwaggerRequest, res: Response, next: NextFunction): void {
  authverifyControllerService.verifyToken(req.swagger.params, res, next);
}