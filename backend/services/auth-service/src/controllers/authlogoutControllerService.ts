import { Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { AuthRequest } from '../middlewares/auth.middleware.js';


export async function logoutUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    // Query parameter for logging out from all sessions
    const logoutAll = req.query.all === 'true';

    // Validate user authentication
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // Verify user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Logout from all sessions if requested
    if (logoutAll) {
      const result = await prisma.session.updateMany({
        where: {
          userId: userId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      console.log(`🚪 User ${userId} logged out from ALL devices. ${result.count} session(s) revoked.`);

      res.status(200).json({
        message: 'Successfully logged out from all devices',
        sessions_revoked: result.count,
      });
      return;
    }

    // Logotu from current session only(default behavior)
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.replace('Bearer ', '').trim();

    if (currentToken) {
      const currentSession = await prisma.session.findFirst({
        where: {
          userId: userId,
          tokenHash: currentToken,
          isActive: true,
        },
      });

      if (currentSession) {
        await prisma.session.update({
          where: { id: currentSession.id },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });

        console.log(`🚪 User ${userId} logged out from current session (${currentSession.id})`);

        res.status(200).json({
          message: 'Successfully logged out',
        });
        return;
      }
    }

    // Fallback: if current session not found, revoke all active sessions
    const result = await prisma.session.updateMany({
      where: {
        userId: userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    console.log(`🚪 User ${userId} logged out (session not found in DB). ${result.count} session(s) revoked as fallback.`);

    res.status(200).json({
      message: 'Successfully logged out from all sessions',
      sessions_revoked: result.count,
    });
  } catch (error) {
    console.error('Error during logout:', error);
    next(error);
  }
}
