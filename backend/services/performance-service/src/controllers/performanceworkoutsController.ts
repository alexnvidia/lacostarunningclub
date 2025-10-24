import { Response, NextFunction } from 'express';
import * as performanceworkoutsControllerService from './performanceworkoutsControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getCurrentWorkout(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceworkoutsControllerService.getCurrentWorkout(req.swagger.params, res, next);
}

export function createWorkout(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceworkoutsControllerService.createWorkout(req.swagger.params, res, next);
}