import { Request } from 'express';

export interface SwaggerRequest extends Request {
  swagger: {
    params: any;
  };
}
