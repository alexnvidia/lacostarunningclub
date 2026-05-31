import { Request, Response, NextFunction } from 'express';
import * as usersidControllerService from './usersidControllerService';

export function listUsersByRole(req: Request, res: Response, next: NextFunction): void {
    usersidControllerService.listUsersByRole(req, res, next);
}
