import { Response, NextFunction } from 'express';
import * as ordershistoryControllerService from './ordershistoryControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getOrderHistory(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordershistoryControllerService.getOrderHistory(req.swagger.params, res, next);
}
