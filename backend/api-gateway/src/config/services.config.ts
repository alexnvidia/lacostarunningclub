export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthCheck: string;
  requiresAuth?: boolean;
}

export const services: Record<string, ServiceConfig> = {
  auth: {
    name: 'Auth Service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    prefix: '/auth',
    healthCheck: '/health',
    requiresAuth: false,
  },
  user: {
    name: 'User Service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    prefix: '/users',
    healthCheck: '/health',
    requiresAuth: true,
  },
  order: {
    name: 'Order Service',
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    prefix: '/orders',
    healthCheck: '/health',
    requiresAuth: true,
  },
  product: {
    name: 'Product Service',
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3004',
    prefix: '/products',
    healthCheck: '/health',
    requiresAuth: false,
  },
  admin: {
    name: 'Admin Service',
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    prefix: '/admin',
    healthCheck: '/health',
    requiresAuth: true,
  },
  communication: {
    name: 'Communication Service',
    url: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3006',
    prefix: '/communication',
    healthCheck: '/health',
    requiresAuth: true,
  },
  performance: {
    name: 'Performance Service',
    url: process.env.PERFORMANCE_SERVICE_URL || 'http://localhost:3007',
    prefix: '/performance',
    healthCheck: '/health',
    requiresAuth: false,
  },
};