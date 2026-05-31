import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/auth.middleware.js';


export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    // Validate that the user is authenticated
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Verify that the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Verify that the user account is active
    if (!user.active) {
      res.status(403).json({
        error: 'User account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    // Verify that the session/token is still valid optional but recommended
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.replace('Bearer ', '').trim();

    if (currentToken) {
      const session = await prisma.session.findFirst({
        where: {
          userId: userId,
          tokenHash: currentToken,
          isActive: true,
          expiresAt: {
            gte: new Date(), // session not expired
          },
        },
      });

      if (!session) {
        res.status(401).json({
          error: 'Session not found or expired',
          code: 'SESSION_INVALID'
        });
        return;
      }
    }

    // Token and user are valid
    res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        active: user.active,
        email_verified: user.emailVerified,
        created_at: user.createdAt.toISOString(),
        last_login: user.lastLogin?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    next(error);
  }
}
