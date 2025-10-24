import { Response, NextFunction } from 'express';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getCurrentWorkout(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for getCurrentWorkout'
  });
}

export function createWorkout(req: SwaggerRequest, res: Response, next: NextFunction): void {
  res.send({
    message: 'This is the mockup controller for createWorkout'
  });
}