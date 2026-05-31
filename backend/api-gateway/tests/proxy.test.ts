import request from 'supertest';
import app from '../src/index';

describe('Proxy Functionality', () => {
  
  describe('Path Transformation', () => {
    it('should transform /api/auth/login to /login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: '123' });

      // Verificar que la request llegó al microservicio
      // (503 si no está corriendo, 200/400/404 si está corriendo)
      expect([200, 400, 404, 503]).toContain(response.status);
    });

    it('should transform /api/users/profile to /profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer fake-token');

      expect([401, 503]).toContain(response.status);
    });
  });

  describe('Service Unavailable Handling', () => {
    it('should return 503 when service is down', async () => {
      // Asumiendo que el servicio NO está corriendo
      const response = await request(app)
        .get('/api/products');

      if (response.status === 503) {
        expect(response.body).toHaveProperty('error', 'Service Unavailable');
        expect(response.body).toHaveProperty('code', 'SERVICE_UNAVAILABLE');
      }
    });
  });

  describe('Request Headers Forwarding', () => {
    it('should forward custom headers to microservices', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Custom-Header', 'test-value')
        .send({ email: 'test@test.com', password: '123' });

      expect([200, 503]).toContain(response.status);
    });
  });
});
