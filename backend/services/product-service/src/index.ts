import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';
// Import controllers
const productsController = require('./controllers/productsControllerService');
const productsIdController = require('./controllers/productsidControllerService');
const productsIdStockController = require('./controllers/productsidstockControllerService');

const app = express();
const PORT = process.env.PORT || 3004;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 product-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'product-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Product Service Running`);
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
  console.log('🎭 Starting Product Service in MOCK mode...');

  // Mock products database
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'LCRC Running T-Shirt',
      description: 'Official La Costa Running Club technical t-shirt',
      price: 25.00,
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Blue', 'Red', 'White', 'Black'],
      stock: 100,
      image_url: 'https://example.com/tshirt.jpg',
      active: true,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'prod-2',
      name: 'LCRC Training Shorts',
      description: 'Comfortable running shorts',
      price: 30.00,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'Navy'],
      stock: 50,
      image_url: 'https://example.com/shorts.jpg',
      active: true,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 'prod-3',
      name: 'LCRC Cap',
      description: 'Running cap with club logo',
      price: 15.00,
      sizes: ['One Size'],
      colors: ['Blue', 'White'],
      stock: 75,
      image_url: 'https://example.com/cap.jpg',
      active: true,
      created_at: '2024-02-01T00:00:00Z'
    }
  ];

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'product-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        listProducts: 'GET /products/products',
        getProduct: 'GET /products/products/:id',
        createProduct: 'POST /products/products',
        updateProduct: 'PUT /products/products/:id',
        deleteProduct: 'DELETE /products/products/:id',
        checkStock: 'POST /products/products/:id/stock'
      }
    });
  });

  // GET / - List all products (PUBLIC)
  app.get('/products/products', (req: Request, res: Response) => {
    const { size, color, active = 'true', page = 1, limit = 20 } = req.query;

    console.log(`👕 Listing products - Filters: size=${size}, color=${color}`);

    let products = [...mockProducts];

    if (active === 'true') {
      products = products.filter(p => p.active);
    }

    if (size) {
      products = products.filter(p => p.sizes.includes(size as string));
    }

    if (color) {
      products = products.filter(p => p.colors.includes(color as string));
    }

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: products.length,
        total_pages: Math.ceil(products.length / Number(limit))
      }
    });
  });
  // GET /:id/stock - Check product stock
  app.get('/products/products/:id/stock', (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`📦 Checking stock for product: ${id}`);

    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
    }

    return res.json({
      product_id: id,
      product_name: product.name,
      stock: product.stock,
      available: product.active && product.stock > 0,
      sizes: product.sizes.map(size => ({
        size,
        available: product.stock > 0
      })),
      colors: product.colors.map(color => ({
        color,
        available: product.stock > 0
      }))
    });
  });
  // GET /:id - Get product by ID (PUBLIC)
  app.get('/products/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`👕 Get product: ${id}`);

    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
    }

    return res.json(product);
  });

  // POST / - Create product (ADMIN)
  app.post('/products/products', (req: Request, res: Response) => {
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }

    const { name, description, price, sizes, colors, stock } = req.body;

    console.log(`➕ Creating product: ${name}`);

    if (!name || !price || !sizes || !colors) {
      return res.status(400).json({
        error: 'Name, price, sizes, and colors are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      name,
      description: description || '',
      price,
      sizes,
      colors,
      stock: stock || 0,
      image_url: 'https://example.com/default.jpg',
      active: true,
      created_at: new Date().toISOString()
    };

    mockProducts.push(newProduct);

    return res.status(201).json(newProduct);
  });

  // PUT /:id - Update product (ADMIN)
  app.put('/products/products/:id', (req: Request, res: Response) => {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }

    console.log(`✏️ Updating product: ${id}`);

    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
    }

    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...req.body,
      id // Preserve ID
    };

    return res.json(mockProducts[productIndex]);
  });

  // DELETE /:id - Delete product (ADMIN)
  app.delete('/products/products/:id', (req: Request, res: Response) => {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }

    console.log(`🗑️ Deleting product: ${id}`);

    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
    }

    mockProducts.splice(productIndex, 1);

    return res.json({ message: 'Product deleted successfully' });
  });


  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      service: 'product-service',
      path: req.path,
      available_endpoints: [
        'GET /products/products',
        'GET /products/products/:id',
        'POST /products/products',
        'PUT /products/products/:id',
        'DELETE /products/products/:id',
        'POST /products/products/:id/stock'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting Product Service in PRODUCTION mode with OAS Tools...');
  const { authMiddleware, isAdmin } = require('./middlewares/authMiddleware');

  // ===== PUBLIC ROUTES =====

  // GET /products - List all products (PUBLIC)
  app.get('/products', (req: Request, res: Response, next: NextFunction) => {
    productsController.listProducts(req, res, next);
  });

  // GET /products/:id - Get product details (PUBLIC)
  app.get('/products/:id', (req: Request, res: Response, next: NextFunction) => {
    productsIdController.getProduct(req, res, next);
  });

  // GET /products/:id/stock - Check product stock (PUBLIC)
  app.get('/products/:id/stock', (req: Request, res: Response, next: NextFunction) => {
    productsIdStockController.checkStock(req, res, next);
  });

  // ===== ADMIN-ONLY ROUTES (authMiddleware → isAdmin → controller) =====

  // POST /products - Create new product (ADMIN)
  app.post('/products', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    productsController.createProduct(req, res, next);
  });

  // PUT /products/:id - Update product (ADMIN)
  app.put('/products/:id', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    productsIdController.updateProduct(req, res, next);
  });

  // DELETE /products/:id - Delete product (ADMIN)
  app.delete('/products/:id', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
    productsIdController.deleteProduct(req, res, next);
  });

  // ===== OAS TOOLS (docs + validation) =====

  const oasFilePath = path.resolve(__dirname, 'openapi', 'product-service.yaml');

  if (!fs.existsSync(oasFilePath)) {
    console.warn(`⚠️  OpenAPI file not found: ${oasFilePath}`);
    console.warn('   Routes are still active. Only OAS docs/validation will be missing.');
    startServer();
  } else {
    const oasConfig: any = {
      oasFile: oasFilePath,
      useAnnotations: false,
      logger: { level: 'info' },
      middleware: {
        router: { controllers: path.join(__dirname, 'controllers') },
        validator: { strict: true, requestValidation: true, responseValidation: true },
        security: { auth: false }
      }
    };

    initialize(app, oasConfig)
      .then(() => startServer())
      .catch((err: any) => {
        console.error('❌ Error initializing OAS Tools:', err);
        startServer();
      });
  }
}

export default app;