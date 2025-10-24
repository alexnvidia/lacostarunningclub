import { Response, NextFunction } from 'express';
import * as adminstatsControllerService from './adminstatsControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}


export function getStatistics(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminstatsControllerService.getStatistics(req.swagger.params, res, next);
}