import { Response, NextFunction } from 'express';
import * as adminstatssalesControllerService from './adminstatssalesControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getSalesStats(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminstatssalesControllerService.getSalesStats(req.swagger.params, res, next);
}
