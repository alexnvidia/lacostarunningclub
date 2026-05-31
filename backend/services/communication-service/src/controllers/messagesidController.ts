import { Request, Response, NextFunction } from 'express';
import * as messagesidControllerService from './messagesidControllerService';

export function getMessage(req: Request, res: Response, next: NextFunction): void {
  messagesidControllerService.getMessage(req, res, next);
}

export function updateMessage(req: Request, res: Response, next: NextFunction): void {
  messagesidControllerService.updateMessage(req, res, next);
}
