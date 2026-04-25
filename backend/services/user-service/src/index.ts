import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import fs from 'fs';
import multer from 'multer';
import * as usersprofileControllerService from './controllers/usersprofileControllerService';
import * as usersrewardsmilestoneclaimControllerService from './controllers/usersrewardsmilestoneclaimControllerService';
import * as usersidControllerService from './controllers/usersidControllerService';
import { listUsersByRole } from './controllers/usersidControllerService';

// ── Multer configuration ──────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/webp', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'avatars');

// Ensure upload directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const userId = req.headers['x-user-id'] as string || 'unknown';
    const ext = file.mimetype === 'image/webp' ? 'webp' : 'png';
    cb(null, `${userId}.${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only WebP and PNG images are allowed'));
    }
  },
});

// ── App setup ─────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3002;
const USE_MOCK = process.env.USE_MOCK === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatars as static files, aligned with the /users prefix
app.use('/users/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
    console.log(`    🖼️  Avatars:    http://localhost:${PORT}/uploads/avatars/`);
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
        avatar: 'POST /users/profile/avatar',
        userById: 'GET /users/:id',
        claimReward: 'POST /users/rewards/:milestone/claim'
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
      avatar_url: null,
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
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    });
  });

  // POST /users/profile/avatar - Upload avatar (MOCK)
  app.post('/users/profile/avatar', avatarUpload.single('avatar'), (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    console.log(`🖼️ Avatar upload for user: ${userId}`);
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded', code: 'BAD_REQUEST' });
      return;
    }
    res.json({
      avatar_url: `/api/users/uploads/avatars/${req.file.filename}`,
      message: 'Avatar uploaded successfully'
    });
  });

  // POST /users/rewards/:milestone/claim - Claim reward (MOCK)
  app.post('/users/rewards/:milestone/claim', (req: Request, res: Response) => {
    const { milestone } = req.params;
    console.log(`🎁 Claim reward ${milestone} for mock user`);
    res.json({
      milestone_months: Number(milestone),
      unlocked: true,
      claimed: true,
      unlocked_at: new Date().toISOString()
    });
  });

  // GET /users/:userId/rewards - List rewards for a user (Admin, MOCK)
  app.get('/users/:userId/rewards', (req: Request, res: Response) => {
    const { userId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    if (userRole !== 'admin' && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - Admin access required', code: 'FORBIDDEN' });
      return;
    }
    console.log(`🏅 List rewards for user: ${userId}`);
    res.json({
      user_id: userId,
      months_active: 7,
      rewards: [
        { milestone_months: 3, unlocked: true, claimed: true, unlocked_at: new Date().toISOString() },
        { milestone_months: 6, unlocked: true, claimed: false, unlocked_at: new Date().toISOString() },
        { milestone_months: 9, unlocked: false, claimed: false, unlocked_at: null },
        { milestone_months: 12, unlocked: false, claimed: false, unlocked_at: null },
      ]
    });
  });

  // GET /:id - Get user by ID (Admin only)
  app.get('/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'admin') {
      res.status(403).json({
        error: 'Forbidden - Admin access required',
        code: 'FORBIDDEN'
      });
      return;
    }

    console.log(`👤 Get user by ID: ${id}`);

    res.json({
      id,
      email: `user${id.substring(0, 4)}@example.com`,
      first_name: 'User',
      last_name: id.substring(0, 4),
      phone: '+34600123456',
      role: 'user',
      avatar_url: null,
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
        'POST /users/profile/avatar',
        'GET /users/:id (admin)'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting User Service in PRODUCTION mode with OAS Tools...');

  // Register controllers manually before OAS initialization

  // GET /users/profile
  app.get('/users/profile', (req: Request, res: Response, next: NextFunction) => {
    usersprofileControllerService.getProfile(req, res, next);
  });

  // PUT /users/profile
  app.put('/users/profile', (req: Request, res: Response, next: NextFunction) => {
    usersprofileControllerService.updateProfile(req, res, next);
  });

  // POST /users/profile/avatar (multipart)
  app.post('/users/profile/avatar',
    avatarUpload.single('avatar'),
    (req: Request, res: Response, next: NextFunction) => {
      usersprofileControllerService.uploadAvatar(req, res, next);
    }
  );

  // POST /users/rewards/:milestone/claim
  app.post('/users/rewards/:milestone/claim', (req: Request, res: Response, next: NextFunction) => {
    usersrewardsmilestoneclaimControllerService.claimReward(req, res, next);
  });

  // GET /users/:userId/rewards
  app.get('/users/:userId/rewards', (req: Request, res: Response, next: NextFunction) => {
    usersrewardsmilestoneclaimControllerService.listRewards(req, res, next);
  });

  // GET /users (admin list)
  app.get('/users', (req: Request, res: Response, next: NextFunction) => {
    listUsersByRole(req, res, next);
  });

  // GET /users/:id
  app.get('/users/:id', (req: Request, res: Response, next: NextFunction) => {
    usersidControllerService.getUserById(req, res, next);
  });

  // ===== OAS TOOLS (docs + validation) =====

  const oasFilePath = path.resolve(__dirname, 'openapi', 'user-service.yaml');

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