import { Response, NextFunction } from 'express';
import * as ordersControllerService from './ordersControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function createOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordersControllerService.createOrder(req.swagger.params, res, next);
}

export function listOrders(req: SwaggerRequest, res: Response, next: NextFunction): void {
  ordersControllerService.listOrders(req.swagger.params, res, next);
}
