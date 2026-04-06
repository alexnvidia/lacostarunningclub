import { Request, Response, NextFunction } from 'express';
import * as service from './performanceworkoutsControllerService';
import { AuthRequest } from '../middlewares/authMiddleware';

export function updateWorkout(req: Request, res: Response, next: NextFunction): void {
  service.updateWorkout(req as AuthRequest, res, next);
}

export function deleteWorkout(req: Request, res: Response, next: NextFunction): void {
  service.deleteWorkout(req as AuthRequest, res, next);
}
