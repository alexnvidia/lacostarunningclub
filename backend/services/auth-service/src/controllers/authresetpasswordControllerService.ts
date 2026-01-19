import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;
    const { new_password } = req.body;

    // Validate token
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Reset token is required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Validate new password
    if (!new_password || new_password.length < 8) {
      res.status(400).json({
        error: 'New password must be at least 8 characters',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    // find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Verify token is not expired
    if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
      res.status(410).json({
        error: 'Reset token has expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    // check new password is different from the old one
    const isSamePassword = await bcrypt.compare(new_password, user.passwordHash);
    if (isSamePassword) {
      res.status(400).json({
        error: 'New password must be different from the old password',
        code: 'SAME_AS_OLD_PASSWORD',
      });
      return;
    }

    // Hash of the new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update user's password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // invalidate all active sessions for the user
    await prisma.session.updateMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    next(error);
  }
}
