import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const prisma = new PrismaClient();

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { current_password, new_password } = req.body;

    // Check if user is authenticated
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    // Check required fields
    if (!current_password || !new_password) {
      res.status(400).json({
        error: 'current_password and new_password are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // find the user in the database
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Check if user is locked
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      res.status(403).json({
        error: 'Account is locked due to multiple failed login attempts',
        code: 'ACCOUNT_LOCKED',
      });
      return;
    }

    // verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      current_password,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
      return;
    }

    // Verify new password is different optional but recommended
    const isSamePassword = await bcrypt.compare(new_password, user.passwordHash);
    if (isSamePassword) {
      res.status(400).json({
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD',
      });
      return;
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password in the database
    await prisma.user.update({
      where: { id: userId },
       data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
}
