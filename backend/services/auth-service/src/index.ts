import dotenv from 'dotenv';
// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { initialize } from '@oas-tools/core';
import * as authregisterControllerService from './controllers/authregisterControllerService.js';
import * as authrefreshtokenControllerService from './controllers/authrefreshtokenControllerService.js';
import * as authloginControllerService from './controllers/authloginControllerService.js';
import * as authchangepasswordControllerService from './controllers/authchangepasswordControllerService.js';
import * as authlogoutControllerService from './controllers/authlogoutControllerService.js';
import * as authverifyControllerService from './controllers/authverifyControllerService.js';
import * as authverifyemailControllerService from './controllers/authverifyemailControllerService.js';
import * as authresendverificationemailControllerService from './controllers/authresendverificationemailControllerService.js';
import * as authforgotpasswordControllerService from './controllers/authforgotpasswordControllerService.js';
import * as authresetpasswordControllerService from './controllers/authresetpasswordControllerService.js';
import * as authresetpasswordformControllerService from './controllers/authresetpasswordformControllerService.js';
import { authMiddleware, AuthRequest } from './middlewares/auth.middleware.js';
import fs from 'fs';
import jwt from 'jsonwebtoken';



import './queue/workers';

const app = express();
const PORT = process.env.PORT || 3001;
const USE_MOCK = process.env.USE_MOCK === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`📝 auth-service: ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    mode: USE_MOCK ? 'mock' : 'production',
    timestamp: new Date().toISOString()
  });
});

const startServer = () => {
  http.createServer(app).listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log(`✅  Auth Service Running`);
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
  console.log('🎭 Starting Auth Service in MOCK mode...');

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'auth-service',
      version: '1.0.0',
      mode: 'mock',
      endpoints: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        changePassword: 'POST /auth/change-password',
        refreshToken: 'POST /auth/refresh-token',
        verify: 'GET /auth/verify'
      }
    });
  });

  // POST /register - Register new user
  app.post('/auth/register', (req: Request, res: Response) => {
    const { email, password, first_name, last_name, phone } = req.body;

    console.log(`📥 Register attempt: ${email}`);

    if (!email || !password || !first_name) {
      return res.status(400).json({
        error: 'Email, password, and first_name are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Mock: Check if email already exists (simplified)
    if (email === 'existing@example.com') {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email,
      first_name,
      last_name,
      phone,
      role: 'user',
      created_at: new Date().toISOString()
    };

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refresh_token: `refresh-${Date.now()}`,
      expires_in: 3600,
      user: newUser
    });
  });

  // POST /login - User login
  app.post('/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    console.log(`📥 Login attempt: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Mock: Simple validation
    if (password === 'wrong') {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'UNAUTHORIZED'
      });
    }

    const user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email,
      first_name: 'Test',
      last_name: 'User',
      role: email.includes('admin') ? 'admin' : 'user',
      created_at: '2024-01-01T00:00:00Z'
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Login successful',
      token,
      refresh_token: `refresh-${Date.now()}`,
      expires_in: 3600,
      user
    });
  });

  // POST /logout - Logout user
  app.post('/auth/logout', (_req: Request, res: Response) => {
    console.log(`📤 User logout`);
    res.json({ message: 'Successfully logged out' });
  });

  // POST /change-password - Change password
  app.post('/auth/change-password', (req: Request, res: Response) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    res.json({ message: 'Password updated successfully' });
  });

  // POST /refresh-token - Refresh access token
  app.post('/auth/refresh-token', (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        error: 'Refresh token is required',
        code: 'UNAUTHORIZED'
      });
    }

    const newToken = jwt.sign(
      { id: '123', email: 'user@example.com', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token: newToken,
      expires_in: 3600
    });
  });

  // GET /verify - Verify JWT token
  app.get('/auth/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      res.json({
        valid: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          first_name: 'Test',
          role: decoded.role
        }
      });
    } catch (error) {
      res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  });

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Route not found',
      service: 'auth-service',
      path: req.path,
      available_endpoints: [
        'POST /auth/register',
        'POST /auth/login',
        'POST /auth/logout',
        'POST /auth/change-password',
        'POST /auth/refresh-token',
        'GET /auth/verify'
      ]
    });
  });

  startServer();

} else {
  console.log('🚀 Starting Auth Service in PRODUCTION mode with OAS Tools...');

  // Register controller services
  app.post('/auth/register', (req: Request, res: Response, next: NextFunction) => {

    authregisterControllerService.registerUser(req, res, next);
  });

  // refresh controller services
  app.post('/auth/refresh-token', (req: Request, res: Response, next: NextFunction) => {

    authrefreshtokenControllerService.refreshToken(req, res, next);
  });

  // login controller services
  app.post('/auth/login', (req: Request, res: Response, next: NextFunction) => {

    authloginControllerService.loginUser(req, res, next);
  });

  // change password controller services
  app.post('/auth/change-password', authMiddleware, (req: AuthRequest, res: Response, next: NextFunction) => {

    authchangepasswordControllerService.changePassword(req, res, next);
  });

  // logout controller services
  app.post('/auth/logout', authMiddleware, (req: AuthRequest, res: Response, next: NextFunction) => {

    authlogoutControllerService.logoutUser(req, res, next);
  });

  // verify controller services
  app.get('/auth/verify', authMiddleware, (req: AuthRequest, res: Response, next: NextFunction) => {

    authverifyControllerService.verifyToken(req, res, next);
  });

  // verify email controller services
  app.get('/auth/verify-email', (req: Request, res: Response, next: NextFunction) => {

    authverifyemailControllerService.verifyEmail(req, res, next);
  });

  // resend verification email controller services
  app.post('/auth/resend-verification-email', (req: Request, res: Response, next: NextFunction) => {

    authresendverificationemailControllerService.resendVerificationEmail(req, res, next);
  });

  // forgot password controller services
  app.post('/auth/forgot-password', (req: Request, res: Response, next: NextFunction) => {

    authforgotpasswordControllerService.forgotPassword(req, res, next);
  });

  // reset password controller services
  app.post('/auth/reset-password', (req: Request, res: Response, next: NextFunction) => {

    authresetpasswordControllerService.resetPassword(req, res, next);
  });

  // get reset password form controller services
  app.get('/auth/reset-password-form', (req: Request, res: Response) => {

    authresetpasswordformControllerService.getResetPasswordForm(req, res);
  });

  const oasFilePath = path.resolve(process.cwd(), '../../docs/openapi/auth-service.yaml');

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