import { Response, NextFunction } from 'express';
import * as messagesControllerService from './messagesControllerService.js';

interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}

export function createMessage(req: SwaggerRequest, res: Response, next: NextFunction): void {
  messagesControllerService.createMessage(req.swagger.params, res, next);
}

export function listMessages(req: SwaggerRequest, res: Response, next: NextFunction): void {
  messagesControllerService.listMessages(req.swagger.params, res, next);
}
