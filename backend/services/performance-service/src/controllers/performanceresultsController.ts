import { Response, NextFunction } from 'express';
import * as performanceresultsControllerService from './performanceresultsControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function uploadRaceResult(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceresultsControllerService.uploadRaceResult(req.swagger.params, res, next);
}

export function getUserResults(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceresultsControllerService.getUserResults(req.swagger.params, res, next);
}
