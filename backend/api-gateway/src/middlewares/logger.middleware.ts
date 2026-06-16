import morgan from 'morgan';
import logger from '../utils/logger';

// Register custom morgan token for x-request-id
morgan.token('request-id', (req: any) => (req.headers['x-request-id'] as string) || '-');

const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

const skip = () => {
  return process.env.DISABLE_HTTP_LOGS === 'true';
};

export const loggerMiddleware = morgan(
  '[:request-id] :method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);