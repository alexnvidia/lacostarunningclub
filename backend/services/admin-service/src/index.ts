import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import { setupBullBoard } from './config/bullBoard';
import * as adminordersControllerService from './controllers/adminordersControllerService';
import * as adminorderspendingControllerService from './controllers/adminorderspendingControllerService';
import * as adminordersidControllerService from './controllers/adminordersidControllerService';
import * as adminusersControllerService from './controllers/adminusersControllerService';
import * as adminstatsControllerService from './controllers/adminstatsControllerService';
import * as adminstatssalesControllerService from './controllers/adminstatssalesControllerService';
import * as adminsubscriptionsControllerService from './controllers/adminsubscriptionsControllerService';
import { isAdmin } from './middlewares/authMiddleware';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3005;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, _res, next) => {
  console.log(`📝 admin-service: ${req.method} ${req.path}`);
  console.log(`   Full URL: ${req.originalUrl}`);
  console.log(`   Headers: ${JSON.stringify(req.headers['x-user-role'])}`);
  next();
});

// Health check (siempre disponible)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'admin-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

// Setup Bull Board for monitoring queues
setupBullBoard(app, '/admin/queues');

// ===== START SERVER FUNCTION =====
const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Admin Service Running`);
    console.log('═══════════════════════════════════════════════');
    console.log(`    Port:        ${PORT}`);
    console.log(`    Mode:        ${USE_MOCK ? '🎭 MOCK' : '🚀 PRODUCTION (OAS Tools)'}`);
    console.log(`    Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────────────');
    console.log(`    ❤️  Health:     http://localhost:${PORT}/health`);

    if (!USE_MOCK) {
      console.log(`    📚 API Docs:   http://localhost:${PORT}/docs`);
    }

    console.log('═══════════════════════════════════════════════');
    console.log('');
  });
};

if (USE_MOCK) {
  console.log('🎭 Starting in MOCK mode...');

  // ========================================
  // MOCK ROUTES (basadas en tu OpenAPI)
  // ========================================

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'admin-service',
      version: '1.0.0',
      message: 'Admin service running in MOCK mode',
      endpoints: {
        health: '/admin/health',
        orders: '/admin/orders',
        users: '/admin/users',
        statistics: '/admin/stats',
        sales_stats: '/admin/stats/sales'
      }
    });
  });

  // ===== ORDER MANAGEMENT =====

  // GET /admin/orders - List all orders
  app.get('/admin/orders', (req: Request, res: Response) => {
    const { status, page = 1, limit = 20 } = req.query;

    console.log(`📦 Listing orders - Status: ${status}, Page: ${page}`);

    const mockOrders = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        order_number: 'ORD-2024-001',
        user_email: 'user1@example.com',
        user_name: 'John Doe',
        order_date: '2024-10-20T10:30:00Z',
        status: status || 'pending',
        total: 120.50,
        total_items: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        order_number: 'ORD-2024-002',
        user_email: 'user2@example.com',
        user_name: 'Jane Smith',
        order_date: '2024-10-21T14:15:00Z',
        status: status || 'confirmed',
        total: 89.99,
        total_items: 2
      }
    ];

    res.json({
      orders: mockOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockOrders.length,
        total_pages: 1
      }
    });
  });

  // GET /admin/orders/pending - Get pending orders
  app.get('/admin/orders/pending', (_req: Request, res: Response) => {
    console.log('📦 Getting pending orders');

    res.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        order_number: 'ORD-2024-001',
        user_email: 'user1@example.com',
        user_name: 'John Doe',
        order_date: '2024-10-20T10:30:00Z',
        status: 'pending',
        total: 120.50,
        total_items: 3
      }
    ]);
  });

  // GET /admin/orders/:id - Get order details
  app.get('/admin/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`📦 Getting order details: ${id}`);

    res.json({
      id,
      order_number: 'ORD-2024-001',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe'
      },
      order_date: '2024-10-20T10:30:00Z',
      status: 'pending',
      subtotal: 100.00,
      shipping_cost: 20.50,
      total: 120.50,
      shipping_address: {
        street: '123 Main St',
        city: 'Barcelona',
        postal_code: '08001',
        country: 'Spain'
      },
      tracking_number: null,
      customer_notes: 'Please deliver in the morning',
      admin_notes: '',
      items: [
        {
          product_id: 'prod-1',
          product_name: 'Running Shoes',
          quantity: 1,
          unit_price: 100.00,
          total: 100.00
        }
      ],
      status_history: [
        {
          previous_status: null,
          new_status: 'pending',
          changed_at: '2024-10-20T10:30:00Z',
          comment: 'Order created'
        }
      ]
    });
  });

  // PATCH /admin/orders/:id - Update order
  app.patch('/admin/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, tracking_number, admin_notes } = req.body;

    console.log(`📦 Updating order ${id}:`, { status, tracking_number, admin_notes });

    res.json({
      id,
      order_number: 'ORD-2024-001',
      status: status || 'pending',
      tracking_number: tracking_number || null,
      admin_notes: admin_notes || '',
      updated_at: new Date().toISOString()
    });
  });

  // ===== USER MANAGEMENT =====

  // GET /admin/users - List all users
  app.get('/admin/users', (req: Request, res: Response) => {
    const { role, active, search, page = 1, limit = 20 } = req.query;
    const userRole = req.headers['x-user-role'];

    console.log(`👥 Listing users - Role: ${role}, Active: ${active}, Search: ${search}`);

    // Verificar que quien accede es admin
    if (userRole !== 'admin') {
      res.status(403).json({
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required'
      });
      return;
    }

    const mockUsers = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        active: true,
        created_at: '2024-01-15T10:00:00Z',
        total_orders: 5,
        total_spent: 450.00
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        active: true,
        created_at: '2024-01-01T10:00:00Z',
        total_orders: 0,
        total_spent: 0
      }
    ];

    res.json({
      users: mockUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockUsers.length,
        total_pages: 1
      }
    });
  });

  // POST /admin/subscriptions - Create/Update subscription
  app.post('/admin/subscriptions', (req: Request, res: Response) => {
    const { user_id } = req.query;
    const { status, start_date } = req.body;
    console.log(`📝 Updating subscription for user ${user_id}: ${status}`);
    res.json({
      id: 'sub-123',
      user_id,
      status: status || 'ACTIVE',
      start_date: start_date || new Date().toISOString(),
      provider: 'buymeacoffee',
      external_id: 'bmc-123'
    });
  });

  // GET /admin/subscriptions - List subscriptions
  app.get('/admin/subscriptions', (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    res.json({
      subscriptions: [
        {
          id: 'sub-123',
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          status: 'ACTIVE',
          start_date: '2024-01-01T00:00:00Z',
          provider: 'buymeacoffee',
          external_id: 'bmc-123'
        }
      ],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 1,
        total_pages: 1
      }
    });
  });

  // ===== STATISTICS =====

  // GET /admin/stats - Get dashboard statistics
  app.get('/admin/stats', (req: Request, res: Response) => {
    const { period = 'month' } = req.query;

    console.log(`📊 Getting statistics for period: ${period}`);

    res.json({
      total_users: 150,
      total_orders: 450,
      pending_orders: 12,
      total_revenue: 15750.50,
      recent_orders: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          order_number: 'ORD-2024-001',
          user_email: 'user1@example.com',
          user_name: 'John Doe',
          order_date: '2024-10-22T08:30:00Z',
          status: 'pending',
          total: 120.50,
          total_items: 3
        }
      ]
    });
  });

  // GET /admin/stats/sales - Get sales statistics
  app.get('/admin/stats/sales', (req: Request, res: Response) => {
    const { from_date, to_date } = req.query;

    console.log(`💰 Getting sales stats from ${from_date} to ${to_date}`);

    res.json({
      period: `${from_date || '2024-01-01'} to ${to_date || '2024-10-22'}`,
      total_sales: 15750.50,
      total_orders: 450,
      average_order_value: 35.00,
      top_products: [
        {
          product_id: 'prod-1',
          product_name: 'Running Shoes',
          quantity_sold: 120,
          revenue: 12000.00
        },
        {
          product_id: 'prod-2',
          product_name: 'T-Shirt',
          quantity_sold: 300,
          revenue: 7500.00
        }
      ]
    });
  });

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    res.status(404).json({
      error: 'Route not found',
      service: 'admin-service',
      path: req.path,
      available_endpoints: [
        'GET /admin/orders',
        'GET /admin/orders/pending',
        'GET /admin/orders/:id',
        'PATCH /admin/orders/:id',
        'GET /admin/users',
        'GET /admin/stats',
        'GET /admin/stats/sales'
      ]
    });
  });

  startServer();

} else {
  // ===== PRODUCCIÓN: OAS Tools =====
  console.log('🚀 Starting in PRODUCTION mode with OAS Tools...');
  // Middleware de autenticación (excuyendo /docs)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/docs') || req.path.startsWith('/queues')) {
      return next();
    }
    return isAdmin(req, res, next);
  });

  //register admin orders controller
  app.get('/admin/orders', (req: Request, res: Response, next: NextFunction) => {
    adminordersControllerService.listAllOrders(req, res, next);
  });

  //register admin orders pending controller
  app.get('/admin/orders/pending', (req: Request, res: Response, next: NextFunction) => {
    adminorderspendingControllerService.getPendingOrders(req, res, next);
  });

  //register admin orders id controller
  app.get('/admin/orders/:id', (req: Request, res: Response, next: NextFunction) => {
    adminordersidControllerService.getOrderDetails(req, res, next);
  });

  //register admin orders id controller
  app.patch('/admin/orders/:id', (req: Request, res: Response, next: NextFunction) => {
    adminordersidControllerService.updateOrder(req, res, next);
  });

  //register admin users controller
  app.get('/admin/users', (req: Request, res: Response, next: NextFunction) => {
    adminusersControllerService.listUsers(req, res, next);
  });

  //register admin stats controller
  app.get('/admin/stats', (req: Request, res: Response, next: NextFunction) => {
    adminstatsControllerService.getStatistics(req, res, next);
  });

  //register admin stats sales controller
  app.get('/admin/stats/sales', (req: Request, res: Response, next: NextFunction) => {
    adminstatssalesControllerService.getSalesStats(req, res, next);
  });

  //register admin subscriptions controller
  app.post('/admin/subscriptions', (req: Request, res: Response, next: NextFunction) => {
    adminsubscriptionsControllerService.createOrUpdateSubscription(req, res, next);
  });

  app.get('/admin/subscriptions', (req: Request, res: Response, next: NextFunction) => {
    adminsubscriptionsControllerService.listSubscriptions(req, res, next);
  });

  const oasFilePath = path.resolve(process.cwd(), '../../docs/openapi/admin-service.yaml');

  if (!fs.existsSync(oasFilePath)) {
    console.warn(`⚠️  OpenAPI file not found: ${oasFilePath}`);
    console.warn('   Set USE_MOCK=true to use mock mode.');

    app.get('*', (_req: Request, res: Response) => {
      res.status(503).json({
        error: 'Service not fully configured',
        message: 'OpenAPI spec not found. Use USE_MOCK=true for testing.',
      });
    });

    startServer();
  } else {
    const oasConfig = {
      oasFile: oasFilePath,
      useAnnotations: false,
      logger: { level: 'info' },
      middleware: {
        router: {
          controllers: path.join(process.cwd(), 'src', 'controllers')
        },
        validator: {
          strict: true,
          requestValidation: true,
          responseValidation: true
        },
        security: { auth: false }
      }
    };

    initialize(app, oasConfig)
      .then(() => startServer())
      .catch((err) => {
        console.error('❌ Error initializing oas-tools:', err);
        startServer();
      });
  }
}

export default app;