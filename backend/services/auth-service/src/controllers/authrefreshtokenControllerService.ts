import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET is not defined. Set it in your .env file.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_LENGTH_BYTES = 40;

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // find active session with the provided refresh token
    const session = await prisma.session.findFirst({
      where: { refreshTokenHash: refresh_token, isActive: true, expiresAt: { gt: new Date() } }
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Obtain user associated with the session
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Generate new JWT and refresh token
    const newToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const newRefreshToken = crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex');

    // disable old session
    await prisma.session.update({
      where: { id: session.id },
      data: { isActive: false, revokedAt: new Date() }
    });

    // Create new session with new refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: newToken,
        refreshTokenHash: newRefreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        device: req.body.device || null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    });

    res.status(200).json({
      token: newToken,
      expires_in: 3600
    });
  } catch (error) {
    next(error);
  }
}
