import { Request, Response} from 'express';
import * as authresetpasswordformControllerService from './authresetpasswordformControllerService.js';

export function getResetPasswordForm(req: Request, res: Response): void {
  authresetpasswordformControllerService.getResetPasswordForm(req, res);
}
