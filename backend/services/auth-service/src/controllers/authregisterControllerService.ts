import { prisma } from '@lcrc/shared';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { emailQueue } from '../queue/emailQueue';
import { EmailTemplate, getEmailContent, EmailData } from '../utils/emailTemplates';


const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345';
const TOKEN_LENGTH_BYTES = 40;
const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // point to frontend URL, at the moment is apigateway

export async function registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB CONFIG] DATABASE_URL definida?:', process.env.DATABASE_URL);
      console.log('[DB CONFIG] Tipo DATABASE_URL:', typeof process.env.DATABASE_URL);
    }
    const { email, password, first_name, last_name, phone } = req.body;

    if (!email || !password || !first_name) {
      res.status(400).json({ error: 'Email, password and first name are required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Verify if email already exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Generate verification token expiration (e.g., 24 hours from now)
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const role = 'user';

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        phone,
        role,
        active: true,
        emailVerified: false,
        verificationToken,
        verificationTokenExpires,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');

    // Save session
    await prisma.session.create({
      data: {
        userId: newUser.id,
        tokenHash: token,
        refreshTokenHash: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        device: req.body.device || null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });


    //prepare data for welcome email  
    const emailData: EmailData = {
      template: EmailTemplate.WELCOME,
      data: {
        firstName: newUser.firstName,
        verificationToken,
        appUrl: APP_URL,
      },
    }
    // 🔥 Generar contenido del email desde plantilla
    const emailContent = getEmailContent(emailData);

    // Encolar email usando la plantilla
    try {
      await emailQueue.add(
        {
          to: newUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(`📧 Welcome email queued for user: ${newUser.email}`);
    } catch (emailError) {
      console.error('Failed to queue welcome email:', emailError);
    }

    // Responder al cliente
    res.status(201).json({
      token,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: newUser.role,
        email_verified: newUser.emailVerified,
        created_at: newUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
