// OAS Tools requires a controller file matching the path /users/profile/avatar.
// The actual route (with multer middleware) is registered manually in index.ts
// before OAS initialization, so Express handles it directly without reaching here.
// This stub satisfies the OAS router's controller discovery.
import * as service from './usersprofileControllerService';
import { Request, Response, NextFunction } from 'express';

export function uploadAvatar(req: Request, res: Response, next: NextFunction) {
    service.uploadAvatar(req, res, next);
}
