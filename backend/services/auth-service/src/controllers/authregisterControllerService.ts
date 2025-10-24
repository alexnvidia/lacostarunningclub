import { Response, NextFunction } from 'express';


interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function registerUser(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for registerUser'
  });
}