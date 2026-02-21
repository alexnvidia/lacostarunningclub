import { Request, Response, NextFunction } from 'express';
import * as productsidstockControllerService from './productsidstockControllerService.js';


export function checkStock(req: Request, res: Response, next: NextFunction): void {
  productsidstockControllerService.checkStock(req, res, next);
}