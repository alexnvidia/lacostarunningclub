import { Response, NextFunction } from 'express';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function createOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for createOrder'
  });
}

export function listOrders(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for listOrders'
  });
}
