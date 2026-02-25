import { Request, Response, NextFunction } from 'express';
import * as service from './performanceworkoutsControllerService';
import { AuthRequest } from '../middlewares/authMiddleware';

export function getCurrentWorkout(req: Request, res: Response, next: NextFunction): void {
  service.getCurrentWorkout(req, res, next);
}

export function createWorkout(req: Request, res: Response, next: NextFunction): void {
  service.createWorkout(req as AuthRequest, res, next);
}