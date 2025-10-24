import request from 'supertest';
import app from '../src/index';
import { generateAdminToken, generateValidToken } from './helpers/testHelpers';

describe('Admin Service - Through Gateway', () => {
  
  const adminToken = generateAdminToken();
  const userToken = generateValidToken({ role: 'user' });

  describe('Order Management', () => {
    it('GET /api/admin/orders - should list orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('GET /api/admin/orders/pending - should get pending orders', async () => {
      const response = await request(app)
        .get('/api/admin/orders/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/admin/orders/:id - should get order details', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response = await request(app)
        .get(`/api/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('order_number');
      expect(response.body).toHaveProperty('items');
    });

    it('PATCH /api/admin/orders/:id - should update order', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'confirmed',
          tracking_number: 'TRACK-123',
          admin_notes: 'Confirmed by admin'
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'confirmed');
      expect(response.body).toHaveProperty('tracking_number', 'TRACK-123');
    });
  });

  describe('User Management', () => {
    it('GET /api/admin/users - admin should list users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('GET /api/admin/users - non-admin should be forbidden', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('Statistics', () => {
    it('GET /api/admin/stats - should return dashboard stats', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('total_orders');
      expect(response.body).toHaveProperty('total_revenue');
    });

    it('GET /api/admin/stats/sales - should return sales stats', async () => {
      const response = await request(app)
        .get('/api/admin/stats/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_sales');
      expect(response.body).toHaveProperty('average_order_value');
      expect(response.body).toHaveProperty('top_products');
    });
  });
});
