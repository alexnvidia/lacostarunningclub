import { Response, NextFunction } from 'express';
import * as adminordersidControllerService from './adminordersidControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}


export function getOrderDetails(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminordersidControllerService.getOrderDetails(req.swagger.params, res, next);
}

export function updateOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminordersidControllerService.updateOrder(req.swagger.params, res, next);
}
