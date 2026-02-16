import * as service from './adminsubscriptionsControllerService';
import { Request, Response, NextFunction } from 'express';

export const createOrUpdateSubscription = (req: Request, res: Response, next: NextFunction) => {
    service.createOrUpdateSubscription(req, res, next);
};

export const listSubscriptions = (req: Request, res: Response, next: NextFunction) => {
    service.listSubscriptions(req, res, next);
};
