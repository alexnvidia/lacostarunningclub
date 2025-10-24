import { Response, NextFunction } from 'express';
import * as messagesidControllerService from './messagesidControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function getMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  messagesidControllerService.getMessage(req.swagger.params, res, next);
}

export function updateMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  messagesidControllerService.updateMessage(req.swagger.params, res, next);
}
