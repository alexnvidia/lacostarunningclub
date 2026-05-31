import { Request, Response, NextFunction } from 'express';
import * as messagesControllerService from './messagesControllerService';

export function createMessage(req: Request, res: Response, next: NextFunction): void {
  messagesControllerService.createMessage(req, res, next);
}

export function listMessages(req: Request, res: Response, next: NextFunction): void {
  messagesControllerService.listMessages(req, res, next);
}
