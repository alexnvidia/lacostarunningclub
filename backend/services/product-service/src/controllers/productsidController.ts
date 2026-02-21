import { Request, Response, NextFunction } from 'express';
import * as productsidControllerService from './productsidControllerService.js';


export function getProduct(req: Request, res: Response, next: NextFunction): void {
  productsidControllerService.getProduct(req, res, next);
}

export function updateProduct(req: Request, res: Response, next: NextFunction): void {
  productsidControllerService.updateProduct(req, res, next);
}
export function deleteProduct(req: Request, res: Response, next: NextFunction): void {
  productsidControllerService.deleteProduct(req, res, next);
}
