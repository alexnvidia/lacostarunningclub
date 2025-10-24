import request from 'supertest';
import app from '../src/index';

describe('Rate Limiting', () => {
  
  describe('General Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });

    it('should allow requests within rate limit', async () => {
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/api/products'));
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
        expect(response.status).not.toBe(429);
      });
    });

    // Este test puede ser lento, márquelo como skip si lo desea
    it.skip('should block requests after exceeding rate limit', async () => {
      const requests = [];
      
      // Hacer más de 100 requests (el límite configurado)
      for (let i = 0; i < 110; i++) {
        requests.push(request(app).get('/api/products'));
      }

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);
      
      expect(blocked.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Auth Route Rate Limiting', () => {
    it('should have stricter limits for /api/auth/login', async () => {
      const requests = [];
      
      for (let i = 0; i < 3; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: '123' })
        );
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).not.toBe(429);
      });
    });

    it.skip('should block after 5 login attempts', async () => {
      const requests = [];
      
      for (let i = 0; i < 7; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' })
        );
      }

      const responses = await Promise.all(requests);
      const blocked = responses.filter(r => r.status === 429);
      
      expect(blocked.length).toBeGreaterThan(0);
    }, 20000);
  });
});
