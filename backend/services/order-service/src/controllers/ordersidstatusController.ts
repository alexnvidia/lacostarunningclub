import { Response, NextFunction } from 'express';
import * as ordersidstatusControllerService from './ordersidstatusControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function updateOrderStatus(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordersidstatusControllerService.updateOrderStatus(req.swagger.params, res, next);
}