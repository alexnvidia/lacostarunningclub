import { Response, NextFunction } from 'express';
import * as productsControllerService from './productsControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function listProducts(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsControllerService.listProducts(req.swagger.params, res, next);
}

export function createProduct(req: SwaggerRequest, res: Response, next: NextFunction): void {
  productsControllerService.createProduct(req.swagger.params, res, next);
}
