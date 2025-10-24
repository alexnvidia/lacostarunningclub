import { Response, NextFunction } from 'express';
import * as performanceworkoutsweekyearControllerService from './performanceworkoutsweekyearControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getWorkoutByWeek(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceworkoutsweekyearControllerService.getWorkoutByWeek(req.swagger.params, res, next);
}