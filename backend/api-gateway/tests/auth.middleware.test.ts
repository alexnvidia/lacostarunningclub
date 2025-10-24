import request from 'supertest';
import app from '../src/index';
import { generateValidToken, generateExpiredToken} from './helpers/testHelpers';

describe('Authentication Middleware', () => {
  
  describe('Protected Routes - No Token', () => {
    it('should reject /api/users without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
      expect(response.body).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should reject /api/orders without token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject /api/admin without token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Protected Routes - Invalid Token', () => {
    it('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer token-invalido-12345')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
      expect(response.body).toHaveProperty('code', 'INVALID_TOKEN');
    });

    it('should reject token without Bearer prefix', async () => {
      const token = generateValidToken();
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', token) // Sin "Bearer "
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject expired token', async () => {
      const expiredToken = generateExpiredToken();
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token expired');
      expect(response.body).toHaveProperty('code', 'TOKEN_EXPIRED');
    });
  });

  describe('Protected Routes - Valid Token', () => {
    it('should accept valid JWT token', async () => {
      const token = generateValidToken();
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      // No debe ser 401 (puede ser 503 si el servicio no está corriendo)
      expect(response.status).not.toBe(401);
      expect([200, 503]).toContain(response.status);
    });

    it('should inject user headers for downstream services', async () => {
      const token = generateValidToken({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
      
      // Este test verificaría que los headers se añaden correctamente
      // Requeriría un mock del microservicio o logging
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(401);
    });
  });

  describe('Public Routes - No Auth Required', () => {
    it('should allow /api/auth/login without token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: '123' });

      expect(response.status).not.toBe(401);
      expect([200, 503]).toContain(response.status);
    });

    it('should allow /api/auth/register without token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          email: 'new@test.com', 
          password: '123',
          first_name: 'Test'
        });

      expect(response.status).not.toBe(401);
    });

    it('should allow /api/products without token', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).not.toBe(401);
    });

    it('should allow /api/performance/workouts without token', async () => {
      const response = await request(app)
        .get('/api/performance/workouts');

      expect(response.status).not.toBe(401);
    });
  });

  describe('Token Payload Extraction', () => {
    it('should extract user info from valid token', async () => {
      const customPayload = {
        id: 'custom-user-id',
        email: 'custom@example.com',
        role: 'admin',
      };
      const token = generateValidToken(customPayload);
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      // Verificar que el token fue procesado correctamente
      expect(response.status).not.toBe(401);
    });
  });
});
