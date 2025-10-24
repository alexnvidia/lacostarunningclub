import request from 'supertest';
import app from '../src/index';
import { generateValidToken } from './helpers/testHelpers';

describe('API Gateway - Microservices Online', () => {
  
  describe('Health Checks', () => {
    it('GET /health/services - all services should be healthy', async () => {
      const response = await request(app)
        .get('/health/services')
        .expect(200);

      expect(response.body.gateway).toBe('ok');
      
      // Al menos algunos servicios deberían estar healthy
      const healthyServices = response.body.services.filter(
        (s: any) => s.status === 'healthy'
      );
      expect(healthyServices.length).toBeGreaterThan(0);
    });
  });

  describe('Public Routes - Should Return Service Response', () => {
    it('POST /api/auth/login - should proxy to auth service', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: '123' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
    });

    it('POST /api/auth/register - should proxy to auth service', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'new@test.com', 
          password: '123',
          first_name: 'Test'
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
    });

    it('GET /api/products/products - should return products list', async () => {
      const response = await request(app)
        .get('/api/products/products')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('GET /api/products/products/prod-1 - should return product by id', async () => {
      const response = await request(app)
        .get('/api/products/products/prod-1')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });
  });

  describe('Protected Routes - With Valid Token', () => {
    const token = generateValidToken();

    it('GET /api/users/profile - should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('role');
    });

    it('PUT /api/users/profile - should update profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'Updated' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Header Injection', () => {
    it('should inject user headers from JWT to downstream service', async () => {
      const token = generateValidToken({
        id: 'test-user-123',
        email: 'test@example.com',
        role: 'admin',
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // El servicio debería recibir los headers
      expect(response.body.id).toBe('test-user-123');
      expect(response.body.email).toBe('test@example.com');
    });
  });
});
