import * as service from './usersprofileControllerService';
import { Request, Response, NextFunction } from 'express';

export function getProfile(req: Request, res: Response, next: NextFunction) {
  service.getProfile(req, res, next);
}

export function updateProfile(req: Request, res: Response, next: NextFunction) {
  service.updateProfile(req, res, next);
}

export function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  service.uploadAvatar(req, res, next);
}