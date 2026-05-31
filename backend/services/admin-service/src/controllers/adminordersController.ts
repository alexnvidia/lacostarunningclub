import { Request, Response, NextFunction } from 'express';
import * as adminordersControllerService from './adminordersControllerService.js';


export function listAllOrders(req: Request, res: Response, next: NextFunction): void {
  adminordersControllerService.listAllOrders(req, res, next);
}
