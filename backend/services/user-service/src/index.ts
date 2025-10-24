import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3002;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 user-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'user-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  User Service Running`);
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
  console.log('🎭 Starting User Service in MOCK mode...');
  
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'user-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        profile: 'GET/PUT /users/profile',
        userById: 'GET /users/:id'
      }
    });
  });

  // GET /profile - Get user profile
  app.get('/users/profile', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    console.log(`👤 Profile request for user: ${userId}`);
    
    res.json({
      id: userId || '123e4567-e89b-12d3-a456-426614174000',
      email: userEmail || 'user@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '+34600123456',
      role: userRole || 'user',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    });
  });

  // PUT /profile - Update user profile
  app.put('/users/profile', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const { first_name, last_name, phone } = req.body;
    
    console.log(`✏️ Update profile for user: ${userId}`);
    
    res.json({
      message: 'profile updated successfully',
      id: userId || '123e4567-e89b-12d3-a456-426614174000',
      email: req.headers['x-user-email'] || 'user@example.com',
      first_name: first_name || 'Test',
      last_name: last_name || 'User',
      phone: phone || '+34600123456',
      role: req.headers['x-user-role'] || 'user',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    });
  });

  // GET /:id - Get user by ID (Admin only)
  app.get('/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
    }
    
    console.log(`👤 Get user by ID: ${id}`);
    
    res.json({
      id,
      email: `user${id.substring(0, 4)}@example.com`,
      first_name: 'User',
      last_name: id.substring(0, 4),
      phone: '+34600123456',
      role: 'user',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    });
  });

  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      service: 'user-service',
      path: req.path,
      available_endpoints: [
        'GET /users/profile',
        'PUT /users/profile',
        'GET /users/:id (admin)'
      ]
    });
  });

  startServer();
  
} else {
  console.log('🚀 Starting User Service in PRODUCTION mode with OAS Tools...');
  
  const oasFilePath = path.resolve(process.cwd(), '../../docs/openapi/user-service.yaml');
  
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