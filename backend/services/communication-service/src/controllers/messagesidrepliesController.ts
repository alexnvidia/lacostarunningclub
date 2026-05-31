import { Request, Response, NextFunction } from 'express';
import * as messagesidrepliesControllerService from './messagesidrepliesControllerService';

export function replyToMessage(req: Request, res: Response, next: NextFunction): void {
  messagesidrepliesControllerService.replyToMessage(req, res, next);
}