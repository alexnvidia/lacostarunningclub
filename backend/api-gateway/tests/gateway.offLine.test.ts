import request from 'supertest';
import app from '../src/index';
import { generateValidToken } from './helpers/testHelpers';

describe('API Gateway - Microservices Offline', () => {
  
  describe('Gateway Health (Should Work)', () => {
    it('GET /health - should return OK even when services are down', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('api-gateway');
    });

    it('GET /health/services - should show all services as unhealthy', async () => {
      const response = await request(app)
        .get('/health/services')
        .expect(200);

      expect(response.body.gateway).toBe('ok');
      expect(Array.isArray(response.body.services)).toBe(true);
      
      // Todos los servicios deberían estar "unhealthy"
      response.body.services.forEach((service: any) => {
        expect(service.status).toBe('unhealthy');
        expect(service).toHaveProperty('error');
      });
    });
  });

  describe('Public Routes - Should Return 503', () => {
    it('POST /api/auth/login - should return 503 (service unavailable)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: '123' })
        .expect(503);

      expect(response.body).toHaveProperty('error', 'Service Unavailable');
      expect(response.body).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/auth/register - should return 503', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'new@test.com', 
          password: '123',
          first_name: 'Test'
        })
        .expect(503);

      expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('GET /api/products - should return 503', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(503);

      expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('GET /api/performance/workouts - should return 503', async () => {
      const response = await request(app)
        .get('/api/performance/workouts')
        .expect(503);

      expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Protected Routes - Auth Check First', () => {
    it('GET /api/users/profile - should return 401 BEFORE checking service (no token)', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
      expect(response.body).toHaveProperty('code', 'UNAUTHORIZED');
      // NO debería llegar a intentar conectar al servicio
    });

    it('GET /api/users/profile - should return 503 AFTER auth passes (with valid token)', async () => {
      const token = generateValidToken();
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(503);

      expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
      // Auth pasó, pero el servicio no está disponible
    });

    it('GET /api/orders - should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/orders - should return 503 with valid token', async () => {
      const token = generateValidToken();
      
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(503);

      expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('GET /api/admin/dashboard - should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/messages - should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({ subject: 'Test', content: 'Test message' })
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('404 Handler - Should Work Independently', () => {
    it('should return 404 for completely invalid routes', async () => {
      const response = await request(app)
        .get('/api/ruta-completamente-inexistente')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 for invalid HTTP methods on valid paths', async () => {
      const response = await request(app)
        .delete('/health')
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Error Handling - Service Timeout', () => {
    it('should timeout gracefully after 30 seconds', async () => {
      // Este test verifica que el timeout está configurado
      const response = await request(app)
        .get('/api/products')
        .timeout(35000); // Esperar un poco más que el timeout del proxy

      expect(response.status).toBe(503);
    }, 40000); // Jest timeout mayor que el request timeout
  });
});
