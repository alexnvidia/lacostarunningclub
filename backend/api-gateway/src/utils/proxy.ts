import axios, { AxiosRequestConfig } from 'axios';
import { Request, Response } from 'express';
import logger from './logger';

export const proxyRequest = async (
  req: Request,
  res: Response,
  targetUrl: string,
  servicePrefix?: string  // ← NUEVO parámetro opcional
): Promise<void> => {
  try {
    // Construir el path final para el microservicio
    let requestPath = req.path;
    
    // Eliminar el prefijo del servicio si existe
    if (servicePrefix && req.path.startsWith(servicePrefix)) {
      requestPath = req.path.substring(servicePrefix.length);
    }
    
    // Si el path queda vacío, usar "/"
    if (!requestPath || requestPath === '') {
      requestPath = '/';
    }

    const config: AxiosRequestConfig = {
      method: req.method,
      url: `${targetUrl}${requestPath}`,  // ← Usa el path limpio
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      params: req.query,
      data:req.body,
      timeout: 30000, // 30 seconds
    };

    logger.debug(
      `Proxying ${req.method} ${req.originalUrl} → ${config.url}`
    );

    const response = await axios(config);

    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      // El microservicio respondió con error
      logger.error(
        `Proxy error: ${error.response.status} from ${targetUrl} - ${error.response.statusText}`
      );
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // No se pudo conectar al microservicio
      logger.error(`Service unavailable: ${targetUrl} - ${error.message}`);
      res.status(503).json({
        error: 'Service Unavailable',
        code: 'SERVICE_UNAVAILABLE',
        message: 'The requested service is currently unavailable.',
      });
    } else {
      // Error en la configuración de la request
      logger.error(`Proxy configuration error: ${error.message}`);
      res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
};