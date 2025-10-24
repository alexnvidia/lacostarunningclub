import { Response, NextFunction } from 'express';
import * as messagesidrepliesControllerService from './messagesidrepliesControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function replyToMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  messagesidrepliesControllerService.replyToMessage(req.swagger.params, res, next);
}