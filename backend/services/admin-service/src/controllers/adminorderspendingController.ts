import { Response, NextFunction } from 'express';
import * as adminorderspendingControllerService from './adminorderspendingControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getPendingOrders(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminorderspendingControllerService.getPendingOrders(req.swagger.params, res, next);
}
