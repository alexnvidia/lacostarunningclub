import request from 'supertest';
import app from '../src/index';

describe('API Gateway - General Tests', () => {
  
  describe('Health Checks', () => {
    it('GET /health - should return gateway health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'api-gateway');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('GET /health/services - should return all services health', async () => {
      const response = await request(app)
        .get('/health/services')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('gateway', 'ok');
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
      expect(response.body.services.length).toBeGreaterThan(0);
      
      // Verificar estructura de cada servicio
      response.body.services.forEach((service: any) => {
        expect(service).toHaveProperty('service');
        expect(service).toHaveProperty('status');
        expect(['healthy', 'unhealthy']).toContain(service.status);
      });
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/ruta-que-no-existe')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body).toHaveProperty('path', '/api/ruta-que-no-existe');
    });

    it('should return 404 for non-existent POST routes', async () => {
      const response = await request(app)
        .post('/api/fake-endpoint')
        .send({ data: 'test' })
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should NOT return 404 for valid routes without token (should be 401 or 503)', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).not.toBe(404);
      expect([401, 503]).toContain(response.status);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Request Body Parsing', () => {
    it('should parse JSON body correctly', async () => {
      const testData = { email: 'test@test.com', password: '123' };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(testData)
        .set('Content-Type', 'application/json');

      // No debería dar error de parsing (400)
      expect(response.status).not.toBe(400);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });
});
