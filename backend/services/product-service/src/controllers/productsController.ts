import { Request, Response, NextFunction } from 'express';
import * as productsControllerService from './productsControllerService.js';


export function listProducts(req: Request, res: Response, next: NextFunction): void {
  productsControllerService.listProducts(req, res, next);
}

export function createProduct(req: Request, res: Response, next: NextFunction): void {
  productsControllerService.createProduct(req, res, next);
}
