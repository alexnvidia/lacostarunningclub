import { Request, Response, NextFunction } from 'express';
import * as usersidControllerService from './usersidControllerService.js';

export function getUserById(req: Request, res: Response, next: NextFunction): void {
  usersidControllerService.getUserById(req, res, next);
}

export function listUsersByRole(req: Request, res: Response, next: NextFunction): void {
  usersidControllerService.listUsersByRole(req, res, next);
}