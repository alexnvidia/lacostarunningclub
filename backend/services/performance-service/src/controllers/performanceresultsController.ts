import { Request, Response, NextFunction } from 'express';
import * as service from './performanceresultsControllerService';
import { AuthRequest } from '../middlewares/authMiddleware';

export function uploadRaceResult(req: Request, res: Response, next: NextFunction): void {
  service.uploadRaceResult(req as AuthRequest, res, next);
}

export function getUserResults(req: Request, res: Response, next: NextFunction): void {
  service.getUserResults(req as AuthRequest, res, next);
}

export function updateRaceResult(req: Request, res: Response, next: NextFunction): void {
  service.updateRaceResult(req as AuthRequest, res, next);
}

export function deleteRaceResult(req: Request, res: Response, next: NextFunction): void {
  service.deleteRaceResult(req as AuthRequest, res, next);
}
