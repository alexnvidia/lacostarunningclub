import { Response, NextFunction } from 'express';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}


export function getSalesStats(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for getSalesStats'
  });
}