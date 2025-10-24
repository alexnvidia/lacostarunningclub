import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';
import { Request, Response } from 'express';
import logger from './logger';

// Crear instancia de Axios reutilizable con configuración optimizada
const proxyClient: AxiosInstance = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  validateStatus: () => true,
});

// Headers que NO deben ser forwardeados
const HEADERS_BLACKLIST = [
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-length',
];

// Métodos HTTP que NO deben tener body
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
    Object.entries(req.headers).forEach(([key, value]) => {
      if (!HEADERS_BLACKLIST.includes(key.toLowerCase()) && value !== undefined) {
        forwardHeaders[key] = value;
      }
    });

    const requestData = NO_BODY_METHODS.includes(req.method) ? undefined : req.body;

    const config: AxiosRequestConfig = {
      method: req.method,
      url: `${targetUrl}${requestPath}`,
      headers: forwardHeaders,
      params: req.query,
      data: requestData,
    };

    logger.debug({
      message: `Proxying ${req.method} ${req.originalUrl}`,
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

    // Manejar diferentes tipos de respuesta
    const contentType = response.headers['content-type'];
    res.status(response.status);
    
    if (contentType?.includes('application/json')) {
      res.json(response.data);
    } else if (contentType?.includes('text')) {
      res.send(response.data);
    } else {
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
      // El microservicio respondió con error
      logger.error(
        `Proxy error: ${error.response.status} from ${targetUrl}`,
        { ...errorContext, status: error.response.status }
      );
      
      // Forward headers de error también
      Object.entries(error.response.headers || {}).forEach(([key, value]) => {
        if (!HEADERS_BLACKLIST.includes(key.toLowerCase())) {
          res.setHeader(key, value as string);
        }
      });
      
      res.status(error.response.status).json(error.response.data);
      
    } else if (error.request) {
      // No se pudo conectar al microservicio
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
      // Timeout específico
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
      // Error en la configuración de la request
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