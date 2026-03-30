import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3003;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 order-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'order-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Order Service Running`);
    console.log('═══════════════════════════════════════════════');
    console.log(`    Port:        ${PORT}`);
    console.log(`    Mode:        ${USE_MOCK ? '🎭 MOCK' : '🚀 OAS Tools'}`);
    console.log('───────────────────────────────────────────────');
    console.log(`    ❤️  Health:     http://localhost:${PORT}/health`);
    if (!USE_MOCK) {
      console.log(`    📚 API Docs:   http://localhost:${PORT}/docs`);
    }
    console.log('═══════════════════════════════════════════════');
  });
};

if (USE_MOCK) {
  console.log('🎭 Starting Order Service in MOCK mode...');

  // Mock orders database
  const mockOrders: any[] = [];

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'order-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        createOrder: 'POST /orders/orders',
        listOrders: 'GET /orders/orders',
        getOrder: 'GET /orders/orders/:id',
        cancelOrder: 'DELETE /orders/orders/:id',
        history: 'GET /orders/orders/history'
      }
    });
  });

  // POST / - Create new order
  app.post('/orders/orders', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const { items, shipping_address, customer_notes } = req.body;

    console.log(`📦 Creating order for user: ${userId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!shipping_address) {
      return res.status(400).json({
        error: 'Shipping address is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const shippingCost = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + shippingCost;

    const newOrder = {
      id: `order-${Date.now()}`,
      order_number: `ORD-${new Date().getFullYear()}-${String(mockOrders.length + 1).padStart(4, '0')}`,
      user_id: userId || '123e4567-e89b-12d3-a456-426614174000',
      user_email: userEmail || 'user@example.com',
      order_date: new Date().toISOString(),
      status: 'pending',
      items,
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_address,
      customer_notes: customer_notes || '',
      admin_notes: '',
      tracking_number: null,
      status_history: [{
        previous_status: null,
        new_status: 'pending',
        changed_at: new Date().toISOString(),
        comment: 'Order created'
      }]
    };

    mockOrders.push(newOrder);

    return res.status(201).json(newOrder);
  });

  // GET / - List user orders
  app.get('/orders/orders', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const { status, page = 1, limit = 20 } = req.query;

    console.log(`📦 Listing orders for user: ${userId}`);

    let userOrders = mockOrders.filter(o => o.user_id === userId);

    if (status) {
      userOrders = userOrders.filter(o => o.status === status);
    }

    // If no orders, return mock data
    if (userOrders.length === 0) {
      userOrders = [
        {
          id: 'order-mock-1',
          order_number: 'ORD-2024-0001',
          user_id: userId,
          order_date: '2024-10-20T10:00:00Z',
          status: 'confirmed',
          total: 45.99,
          total_items: 2
        }
      ];
    }

    res.json({
      orders: userOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userOrders.length,
        total_pages: Math.ceil(userOrders.length / Number(limit))
      }
    });
  });

  // GET /:id - Get order details
  app.get('/orders/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    console.log(`📦 Get order details: ${id}`);

    const order = mockOrders.find(o => o.id === id && o.user_id === userId);

    if (!order) {
      // Return mock order
      return res.json({
        id,
        order_number: 'ORD-2024-0001',
        user_id: userId,
        user_email: req.headers['x-user-email'] || 'user@example.com',
        order_date: '2024-10-20T10:00:00Z',
        status: 'confirmed',
        items: [
          {
            product_id: 'prod-1',
            product_name: 'T-Shirt Running XL',
            size: 'XL',
            color: 'Blue',
            quantity: 1,
            unit_price: 25.00,
            total: 25.00
          }
        ],
        subtotal: 25.00,
        shipping_cost: 5.99,
        total: 30.99,
        shipping_address: {
          street: '123 Main St',
          city: 'Barcelona',
          postal_code: '08001',
          country: 'Spain'
        },
        customer_notes: '',
        tracking_number: 'TRACK-123456',
        status_history: [
          {
            previous_status: null,
            new_status: 'pending',
            changed_at: '2024-10-20T10:00:00Z',
            comment: 'Order created'
          },
          {
            previous_status: 'pending',
            new_status: 'confirmed',
            changed_at: '2024-10-20T11:00:00Z',
            comment: 'Order confirmed'
          }
        ]
      });
    }

    return res.json(order);
  });

  // DELETE /:id - Cancel order
  app.delete('/orders/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    console.log(`❌ Cancel order: ${id} by user: ${userId}`);

    const orderIndex = mockOrders.findIndex(o => o.id === id && o.user_id === userId);

    if (orderIndex === -1) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'NOT_FOUND'
      });
    }

    const order = mockOrders[orderIndex];

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        error: 'Order cannot be cancelled',
        code: 'INVALID_STATUS'
      });
    }

    order.status = 'cancelled';
    order.status_history.push({
      previous_status: order.status,
      new_status: 'cancelled',
      changed_at: new Date().toISOString(),
      comment: 'Cancelled by user'
    });

    return res.json({ message: 'Order cancelled successfully', order });
  });

  // PATCH /:id/status - Update order status (ADMIN ONLY)
  app.patch('/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const { status, tracking_number, admin_notes } = req.body;

    console.log(`📝 Update order status: ${id} by admin`);

    // Verify that the updater is an admin
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate that the status is valid
    const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Valid values: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }

    const orderIndex = mockOrders.findIndex(o => o.id === id);

    if (orderIndex === -1) {
      return res.status(404).json({
        error: 'Order not found',
        code: 'NOT_FOUND'
      });
    }

    const order = mockOrders[orderIndex];
    const previousStatus = order.status;

    // Update the status
    order.status = status;

    // Update tracking number if provided
    if (tracking_number) {
      order.tracking_number = tracking_number;
    }

    // Update admin notes if provided
    if (admin_notes) {
      order.admin_notes = admin_notes;
    }

    // Add to status history
    order.status_history.push({
      previous_status: previousStatus,
      new_status: status,
      changed_at: new Date().toISOString(),
      comment: admin_notes || `Status changed to ${status} by admin`
    });

    return res.json({
      message: 'Order status updated successfully',
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        tracking_number: order.tracking_number,
        admin_notes: order.admin_notes,
        updated_at: new Date().toISOString()
      }
    });
  });

  // GET /history - Order history with filters
  app.get('/orders/orders/history', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const { from_date, to_date, status } = req.query;

    console.log(`📜 Order history for user: ${userId}`);

    let userOrders = mockOrders.filter(o => o.user_id === userId);

    if (status) {
      userOrders = userOrders.filter(o => o.status === status);
    }

    res.json({
      orders: userOrders.length > 0 ? userOrders : [
        {
          id: 'order-history-1',
          order_number: 'ORD-2024-0001',
          order_date: '2024-10-15T10:00:00Z',
          status: 'delivered',
          total: 45.99
        }
      ],
      filters: {
        from_date: from_date || null,
        to_date: to_date || null,
        status: status || null
      }
    });
  });

  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      service: 'order-service',
      available_endpoints: [
        'POST /orders/orders',
        'GET /orders/orders',
        'GET /orders/orders/:id',
        'DELETE /orders/orders/:id',
        'PATCH /orders/orders/:id/status (admin)',
        'GET /orders/orders/history'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting Order Service in PRODUCTION mode with OAS Tools...');

  const oasFilePath = path.resolve(process.cwd(), '../../docs/openapi/order-service.yaml');

  if (!fs.existsSync(oasFilePath)) {
    console.warn(`⚠️  OpenAPI file not found: ${oasFilePath}`);
    app.get('*', (_req, res) => {
      res.status(503).json({ error: 'Service not fully configured' });
    });
    startServer();
  } else {
    const oasConfig = {
      oasFile: oasFilePath,
      useAnnotations: false,
      logger: { level: 'info' },
      middleware: {
        router: { controllers: path.join(process.cwd(), 'src', 'controllers') },
        validator: { strict: true, requestValidation: true, responseValidation: true },
        security: { auth: false }
      }
    };

    initialize(app, oasConfig)
      .then(() => startServer())
      .catch((err) => {
        console.error('❌ Error initializing OAS Tools:', err);
        startServer();
      });
  }
}

export default app;