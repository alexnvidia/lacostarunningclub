import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.headers['x-user-role'] as string;

    // Admin-only endpoint
    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden - Admin access required', code: 'FORBIDDEN' });
      return;
    }

    // Support Express (req.params)
    const id = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      res.status(400).json({ error: 'Invalid user ID format. Must be a valid UUID', code: 'BAD_REQUEST' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        rewards: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    // Calculate subscription duration
    let monthsActive = 0;
    if (user.subscription && user.subscription.startDate) {
      const now = new Date();
      const start = new Date(user.subscription.startDate);
      monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
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
        unlocked_at: isUnlocked ? (userReward?.unlockedAt || null) : null
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

export const listUsersByRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const callerRole = req.headers['x-user-role'] as string;

    // Only ADMIN or SUPPORT can list users
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPPORT') {
      res.status(403).json({ error: 'Forbidden - Staff access required', code: 'FORBIDDEN' });
      return;
    }

    const roleParam = (req.query.role as string | undefined)?.toUpperCase();
    const VALID_ROLES = ['USER', 'ADMIN', 'SUPPORT', 'TRAINER'];

    if (!roleParam || !VALID_ROLES.includes(roleParam)) {
      res.status(400).json({
        error: `role query param is required. Allowed: ${VALID_ROLES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const users = await prisma.user.findMany({
      where: { role: roleParam as any, active: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { firstName: 'asc' },
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
        role: u.role.toLowerCase(),
      })),
    });
  } catch (error) {
    next(error);
  }
};