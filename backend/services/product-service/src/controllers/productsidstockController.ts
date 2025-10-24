import { Response, NextFunction } from 'express';
import * as productsidstockControllerService from './productsidstockControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function checkStock(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsidstockControllerService.checkStock(req.swagger.params, res, next);
}