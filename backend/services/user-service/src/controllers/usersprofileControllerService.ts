import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        rewards: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate subscription duration
    let monthsActive = 0;
    if (user.subscription && user.subscription.startDate) {
      const now = new Date();
      const start = new Date(user.subscription.startDate);
      // Simple month difference calculation
      monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      // Adjust if day of month hasn't passed yet
      if (now.getDate() < start.getDate()) {
        monthsActive--;
      }
      if (monthsActive < 0) monthsActive = 0;
    }

    // Prepare rewards status
    const milestones = [3, 6, 9, 12];
    const rewardsStatus = milestones.map(milestone => {
      const userReward = user.rewards.find(r => r.milestoneMonths === milestone);
      const isUnlocked = monthsActive >= milestone;
      return {
        milestone_months: milestone,
        unlocked: isUnlocked,
        claimed: userReward?.isClaimed || false,
        unlocked_at: isUnlocked ? (userReward?.unlockedAt || null) : null // Logic could be improved to estimate unlock date
      };
    });

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role: user.role.toLowerCase(),
      created_at: user.createdAt,
      last_login: user.lastLogin,
      email_verified: user.emailVerified,
      subscription: user.subscription ? {
        status: user.subscription.status,
        active_since: user.subscription.startDate,
        months_active: monthsActive
      } : null,
      rewards: rewardsStatus
    });

  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { first_name, last_name, phone } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validation
    const errors: string[] = [];

    if (first_name !== undefined) {
      if (typeof first_name !== 'string') {
        errors.push('first_name must be a string');
      } else if (first_name.length < 2 || first_name.length > 100) {
        errors.push('first_name must be between 2 and 100 characters');
      }
    }

    if (last_name !== undefined) {
      if (typeof last_name !== 'string') {
        errors.push('last_name must be a string');
      } else if (last_name.length > 100) {
        errors.push('last_name must be at most 100 characters');
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        errors.push('phone must be a string');
      } else {
        const phoneRegex = /^\+?[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phone)) {
          errors.push('phone must be a valid E.164 phone number. min 7 digits');
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'BAD_REQUEST',
        details: errors
      });
      return;
    }

    if (first_name === undefined && last_name === undefined && phone === undefined) {
      res.status(400).json({
        error: 'At least one field (first_name, last_name, or phone) must be provided',
        code: 'BAD_REQUEST'
      });
      return;
    }
    // check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: first_name,
        lastName: last_name,
        phone: phone
      }
    });


    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role.toLowerCase(),
      created_at: updatedUser.createdAt,
      last_login: updatedUser.lastLogin
    });

  } catch (error) {
    next(error);
  }
};