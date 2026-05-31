import { Response, NextFunction } from 'express';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for getOrder'
  });
}

export function cancelOrder(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for cancelOrder'
  });
}
