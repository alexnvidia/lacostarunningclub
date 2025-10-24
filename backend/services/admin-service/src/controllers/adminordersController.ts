import { Response, NextFunction } from 'express';
import * as adminordersControllerService from './adminordersControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function listAllOrders(req: SwaggerRequest, res: Response, next: NextFunction): void {
  adminordersControllerService.listAllOrders(req.swagger.params, res, next);
}
