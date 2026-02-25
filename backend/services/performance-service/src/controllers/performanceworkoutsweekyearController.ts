import { Request, Response, NextFunction } from 'express';
import * as service from './performanceworkoutsweekyearControllerService';

export function getWorkoutByWeek(req: Request, res: Response, next: NextFunction): void {
  service.getWorkoutByWeek(req, res, next);
}