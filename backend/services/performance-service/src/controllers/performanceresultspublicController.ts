import { Request, Response, NextFunction } from 'express';
import * as service from './performanceresultspublicControllerService';

export function getPublicResults(req: Request, res: Response, next: NextFunction): void {
  service.getPublicResults(req, res, next);
}