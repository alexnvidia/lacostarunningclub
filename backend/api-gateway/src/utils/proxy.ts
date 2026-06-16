import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import { Request, Response } from 'express';
import logger from './logger';

// Create reusable Axios instance with optimized configuration
const proxyClient: AxiosInstance = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  validateStatus: () => true,
});

// Headers that should NOT be forwarded
const HEADERS_BLACKLIST = [
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-length',
];

// HTTP methods that should NOT have body
const NO_BODY_METHODS = ['GET', 'HEAD'];

export const proxyRequest = async (
  req: Request,
  res: Response,
  targetUrl: string,
  servicePrefix?: string
): Promise<void> => {
  try {
    // here we need to reconstruct the request path,
    // delete only the service prefix from the baseUrl
    //
    // example:
    //  req.baseUrl = "/api/performance"
    //  API_PREFIX = "/api"
    //  restPath = "/performance" → we want to keep this part
    //  req.path = "/results/public"
    //
    //  requestPath = "/performance/results/public"

    const API_PREFIX = process.env.API_PREFIX || '/api';
    // we obtain the service prefix from baseUrl by removing the API_PREFIX
    const servicePrefixFromBase = req.baseUrl.replace(API_PREFIX, '');
    const requestPath = servicePrefixFromBase + req.path;

    // filter headers to forward
    const forwardHeaders: Record<string, string | string[]> = {};
    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

    Object.entries(req.headers).forEach(([key, value]) => {
      const isBlacklisted = HEADERS_BLACKLIST.includes(key.toLowerCase());
      const isContentLength = key.toLowerCase() === 'content-length';

      let shouldForward = !isBlacklisted;
      if (isMultipart && isContentLength) {
        shouldForward = true; // Rescate de content-length para subida de ficheros
      }

      if (shouldForward && value !== undefined) {
        forwardHeaders[key] = value;
      }
    });

    const requestData = NO_BODY_METHODS.includes(req.method.toUpperCase()) 
      ? undefined 
      : (isMultipart ? req : req.body);

    const config: AxiosRequestConfig = {
      method: req.method,
      url: `${targetUrl}${requestPath}`,
      headers: forwardHeaders,
      params: req.query,
      data: requestData,
      responseType: 'arraybuffer', // Forzar bytes crudos para no corromper imágenes
    };

    logger.debug({
      message: `Proxying ${req.method} ${req.originalUrl}`,
      requestId: req.headers['x-request-id'],
      routeMap: {
        baseUrl: req.baseUrl,
        path: req.path,
        target: `${targetUrl}${requestPath}`,
      },
      servicePrefix: servicePrefix,
    });

    const response = await proxyClient.request(config);

    // Forward response headers (excepto problemáticos)
    Object.entries(response.headers).forEach(([key, value]) => {
      if (!HEADERS_BLACKLIST.includes(key.toLowerCase())) {
        res.setHeader(key, value as string);
      }
    });

    // Manage different response types
    const contentType = response.headers['content-type'];
    res.status(response.status);

    if (contentType?.includes('application/json')) {
      try {
        const jsonStr = Buffer.isBuffer(response.data) 
          ? response.data.toString('utf-8') 
          : response.data;
        res.json(JSON.parse(jsonStr));
      } catch (e) {
        res.send(response.data);
      }
    } else {
      // res.send soporta Buffers nativamente sin añadir charset=utf-8
      res.send(response.data);
    }

  } catch (error: any) {
    const errorContext = {
      method: req.method,
      originalUrl: req.originalUrl,
      targetUrl,
      servicePrefix,
    };

    if (error.response) {
      // The microservice responded with an error
      logger.error(
        `Proxy error: ${error.response.status} from ${targetUrl}`,
        { ...errorContext, status: error.response.status }
      );

      // Forward error headers too
      Object.entries(error.response.headers || {}).forEach(([key, value]) => {
        if (!HEADERS_BLACKLIST.includes(key.toLowerCase())) {
          res.setHeader(key, value as string);
        }
      });

      res.status(error.response.status).json(error.response.data);

    } else if (error.request) {
      // Could not connect to the microservice
      logger.error(
        `Service unavailable: ${targetUrl} - ${error.message}`,
        errorContext
      );
      res.status(503).json({
        error: 'Service Unavailable',
        code: 'SERVICE_UNAVAILABLE',
        message: 'The requested service is currently unavailable.',
      });

    } else if (error.code === 'ECONNABORTED') {
      // Specific timeout
      logger.error(
        `Service timeout: ${targetUrl} exceeded 30s`,
        errorContext
      );
      res.status(504).json({
        error: 'Gateway Timeout',
        code: 'GATEWAY_TIMEOUT',
        message: 'The service took too long to respond.',
      });

    } else {
      // Error in the request configuration
      logger.error(
        `Proxy configuration error: ${error.message}`,
        errorContext
      );
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      });
    }
  }
};