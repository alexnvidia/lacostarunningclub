import { Response, NextFunction } from 'express';
import * as performanceresultspublicControllerService from './performanceresultspublicControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getPublicResults(req: SwaggerRequest, res: Response, next: NextFunction): void {
  performanceresultspublicControllerService.getPublicResults(req.swagger.params, res, next);
}