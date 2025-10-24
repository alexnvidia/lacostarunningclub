import { Response, NextFunction } from 'express';
import * as productsidControllerService from './productsidControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getProduct(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsidControllerService.getProduct(req.swagger.params, res, next);
}

export function updateProduct(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsidControllerService.updateProduct(req.swagger.params, res, next);
}
export function deleteProduct(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsidControllerService.deleteProduct(req.swagger.params, res, next);
}
