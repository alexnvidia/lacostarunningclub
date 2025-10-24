import { Response, NextFunction } from 'express';
import * as ordersidControllerService from './ordersidControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordersidControllerService.getOrder(req.swagger.params, res, next);
}

export function cancelOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordersidControllerService.cancelOrder(req.swagger.params, res, next);
}
