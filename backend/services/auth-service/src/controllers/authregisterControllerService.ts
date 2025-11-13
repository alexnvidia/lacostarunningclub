import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { ref } from 'joi';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345';
const TOKEN_LENGTH_BYTES = 40;


export async function registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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

    const role = 'user'; // fixed role for registered users

    // create new user
    const newUser = await prisma.user.create({
       data:{
        email,
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        phone,
        role,
        active: true,
      },
    });

    const token = jwt.sign({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    }, JWT_SECRET, { expiresIn: '1h' });

        // Generate refresh token
    const refreshToken = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');

    // save session with refresh token
    await prisma.session.create({
      data:{
        userId: newUser.id,
        tokenHash: token,  // o hash del token de acceso
        refreshTokenHash: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        device: req.body.device || null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // example: 30 days
        isActive: true
      }
    });

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
        created_at: newUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
