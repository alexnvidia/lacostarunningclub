import { prisma } from '@lcrc/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ref } from 'joi';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345';
const TOKEN_LENGTH_BYTES = 40;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_TIME_MINUTES = 30;


export async function loginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    //logging login attempt
    console.log(`📥 Login attempt: ${email}`);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
      return;
    }
    // reset attempts if lockout time has passed
    if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
      //update object to reflect reset
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
    }
    // Check for account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      //revoke active sessions
      await prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, revokedAt: new Date() },
      });
      res.status(403).json({ error: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${user.lockoutUntil.toISOString()}..`, code: 'ACCOUNT_LOCKED' });
      return;
    }

    // Verificar password hasheado
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      // Increment failed login attempts
      let failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock account if max attempts exceeded
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockoutUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60000);
        failedAttempts = 0; // reset after lockout
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
      return;
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Disable previous active sessions
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    // Generate refresh token
    const refreshToken = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');

    // Create new session with new refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: token,
        refreshTokenHash: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        device: req.body.device || null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    });
    // update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });



    res.status(200).json({
      token,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        created_at: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
