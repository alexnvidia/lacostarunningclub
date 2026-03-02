import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3006;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 communication-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'communication-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Communication Service Running`);
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
  console.log('🎭 Starting Communication Service in MOCK mode...');

  // Mock messages database
  const mockMessages: any[] = [];

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'communication-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        createMessage: 'POST /communication/messages',
        listMessages: 'GET /communication/messages',
        getMessage: 'GET /communication/messages/:id',
        updateMessage: 'PATCH /communication/messages/:id',
        replyMessage: 'POST /communication/messages/:id/replies'
      }
    });
  });

  // POST /messages - Create new message
  app.post('/communication/messages', (req: Request, res: Response): void => {
    const userId = req.headers['x-user-id'] as string;
    const userEmail = req.headers['x-user-email'] as string;
    const { subject, content, priority } = req.body;

    console.log(`💬 Creating message from user: ${userId}`);

    if (!subject || !content) {
      res.status(400).json({
        error: 'Subject and content are required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      user_id: userId || '123e4567-e89b-12d3-a456-426614174000',
      user_email: userEmail || 'user@example.com',
      subject,
      content,
      priority: priority || 'medium',
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      replies: []
    };

    mockMessages.push(newMessage);

    res.status(201).json(newMessage);
  });

  // GET /messages - List user messages
  app.get('/communication/messages', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    const { status, page = 1, limit = 20 } = req.query;

    console.log(`💬 Listing messages for user: ${userId}`);

    let userMessages = mockMessages.filter(m => m.user_id === userId);

    if (status) {
      userMessages = userMessages.filter(m => m.status === status);
    }

    // If no messages, return mock data
    if (userMessages.length === 0) {
      userMessages = [
        {
          id: 'msg-mock-1',
          user_id: userId,
          subject: 'Question about order',
          content: 'When will my order be shipped?',
          priority: 'medium',
          status: 'in_progress',
          created_at: '2024-10-20T10:00:00Z',
          updated_at: '2024-10-20T11:00:00Z',
          replies_count: 1
        }
      ];
    }

    res.json({
      messages: userMessages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userMessages.length,
        total_pages: Math.ceil(userMessages.length / Number(limit))
      }
    });
  });

  // GET /messages/:id - Get message details
  app.get('/communication/messages/:id', (req: Request, res: Response): void => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    console.log(`💬 Get message: ${id}`);

    const message = mockMessages.find(m => m.id === id);

    // Admin can see all messages, users only their own
    if (message && (message.user_id === userId || userRole === 'admin')) {
      res.json(message);
      return;
    }

    // Return mock message
    res.json({
      id,
      user_id: userId,
      user_email: 'user@example.com',
      subject: 'Question about order',
      content: 'When will my order be shipped?',
      priority: 'medium',
      status: 'in_progress',
      created_at: '2024-10-20T10:00:00Z',
      updated_at: '2024-10-20T11:00:00Z',
      replies: [
        {
          id: 'reply-1',
          content: 'Your order will be shipped tomorrow',
          from_admin: true,
          created_at: '2024-10-20T11:00:00Z'
        }
      ]
    });
  });

  // PATCH /messages/:id - Update message (USER - own messages only)
  app.patch('/communication/messages/:id', (req: Request, res: Response): void => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const { subject, content, priority } = req.body;

    console.log(`✏️ Updating message: ${id} by user: ${userId}`);

    const messageIndex = mockMessages.findIndex(m => m.id === id && m.user_id === userId);

    if (messageIndex === -1) {
      res.status(404).json({
        error: 'Message not found or unauthorized',
        code: 'NOT_FOUND'
      });
      return;
    }

    const message = mockMessages[messageIndex];

    // Only allow updates if message is still open
    if (message.status !== 'open') {
      res.status(400).json({
        error: 'Cannot update message that is not open',
        code: 'INVALID_STATUS'
      });
      return;
    }

    // Update fields
    if (subject) message.subject = subject;
    if (content) message.content = content;
    if (priority) message.priority = priority;
    message.updated_at = new Date().toISOString();

    res.json({
      message: 'Message updated successfully',
      data: message
    });
  });

  // POST /messages/:id/reply - Reply to message (ADMIN)
  app.post('/communication/messages/:id/replies', (req: Request, res: Response): void => {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const { content, close_message } = req.body;

    console.log(`💬 Reply to message: ${id}`);

    if (userRole !== 'admin') {
      res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
      return;
    }

    if (!content) {
      res.status(400).json({
        error: 'Content is required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    const message = mockMessages.find(m => m.id === id);

    if (!message) {
      res.status(404).json({
        error: 'Message not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    const reply = {
      id: `reply-${Date.now()}`,
      content,
      from_admin: true,
      created_at: new Date().toISOString()
    };

    message.replies.push(reply);
    message.updated_at = new Date().toISOString();

    if (close_message) {
      message.status = 'resolved';
    } else {
      message.status = 'in_progress';
    }

    res.status(201).json({
      message: 'Reply added successfully',
      reply,
      message_status: message.status
    });
  });

  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      service: 'communication-service',
      available_endpoints: [
        'POST /communication/messages',
        'GET /communication/messages',
        'GET /communication/messages/:id',
        'PATCH /communication/messages/:id',
        'POST /communication/messages/:id/reply (admin)'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting Communication Service in PRODUCTION mode with OAS Tools...');

  const { authMiddleware, isAdmin } = require('./middlewares/authMiddleware');
  const messagesController = require('./controllers/messagesControllerService');
  const messagesIdController = require('./controllers/messagesidControllerService');
  const repliesController = require('./controllers/messagesidrepliesControllerService');

  const oasFilePath = path.resolve(process.cwd(), '../../docs/openapi/communication-service.yaml');

  if (!fs.existsSync(oasFilePath)) {
    console.warn(`⚠️  OpenAPI file not found: ${oasFilePath}`);
    app.get('*', (_req, res) => {
      res.status(503).json({ error: 'Service not fully configured' });
    });
    startServer();
  } else {

    // ===== RUTAS AUTENTICADAS (usuario) =====

    // POST /messages - Crear nuevo mensaje
    app.post('/communication/messages', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
      messagesController.createMessage(req, res, next);
    });

    // GET /messages - Listar mensajes del usuario
    app.get('/communication/messages', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
      messagesController.listMessages(req, res, next);
    });

    // GET /messages/:id - Ver detalle de un mensaje
    app.get('/communication/messages/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
      messagesIdController.getMessage(req, res, next);
    });

    // POST /messages/:id/replies - Responder a un mensaje
    app.post('/communication/messages/:id/replies', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
      repliesController.replyToMessage(req, res, next);
    });

    // ===== RUTA ADMIN (authMiddleware → isAdmin → controller) =====

    // PATCH /messages/:id - Actualizar estado del mensaje (ADMIN)
    app.patch('/communication/messages/:id', authMiddleware, isAdmin, (req: Request, res: Response, next: NextFunction) => {
      messagesIdController.updateMessage(req, res, next);
    });

    const oasConfig: any = {
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
      .catch((err: any) => {
        console.error('❌ Error initializing OAS Tools:', err);
        startServer();
      });
  }
}

// ===== GLOBAL ERROR HANDLER =====
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Unhandled error in communication-service:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

export default app;
