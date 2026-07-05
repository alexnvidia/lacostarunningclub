import * as service from './adminstripecheckoutsessionControllerService';
import { Request, Response, NextFunction } from 'express';

export const cancelSubscription = (req: Request, res: Response, next: NextFunction) => {
    service.cancelSubscription(req, res, next);
};