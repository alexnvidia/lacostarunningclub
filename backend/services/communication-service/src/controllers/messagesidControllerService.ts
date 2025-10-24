import { Response, NextFunction } from 'express';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for getMessage'
  });
}

export function updateMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for updateMessage'
  });
}