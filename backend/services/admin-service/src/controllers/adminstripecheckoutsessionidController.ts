import { Request, Response, NextFunction } from 'express';
import * as service from './adminstripecheckoutsessionidControllerService';

export const getCheckoutSession = (req: Request, res: Response, next: NextFunction) => {
    service.getCheckoutSession(req, res, next);
};