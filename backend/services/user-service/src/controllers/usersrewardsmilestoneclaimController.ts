import * as service from './usersrewardsmilestoneclaimControllerService';
import { Request, Response, NextFunction } from 'express';

export function claimReward(req: Request, res: Response, next: NextFunction) {
    service.claimReward(req, res, next);
}
