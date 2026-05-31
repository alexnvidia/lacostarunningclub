import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

export const claimReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const milestone = Number(req.params.milestone);

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (isNaN(milestone)) {
            res.status(400).json({ error: 'Invalid milestone' });
            return;
        }

        const validMilestones = [3, 6, 9, 12];
        if (!validMilestones.includes(milestone)) {
            res.status(400).json({ error: 'Invalid milestone value. Must be 3, 6, 9, or 12.' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                subscription: true,
                rewards: true
            }
        });

        if (!user || !user.subscription || !user.subscription.startDate) {
            res.status(400).json({ error: 'User does not have an active subscription with start date.' });
            return;
        }

        // Calculate active months
        const now = new Date();
        const start = new Date(user.subscription.startDate);
        let monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < start.getDate()) {
            monthsActive--;
        }

        if (monthsActive < milestone) {
            res.status(400).json({ error: 'Reward is locked. Keep your subscription active to unlock it.' });
            return;
        }

        // Check if already claimed
        const existingReward = user.rewards.find(r => r.milestoneMonths === milestone);
        if (existingReward?.isClaimed) {
            res.status(400).json({ error: 'Reward already claimed.' });
            return;
        }

        // Create or update reward status
        // If "unlocked" state was tracked, we'd update. Since we calculate unlock on fly, we just create the record as claimed.
        // But if we want to support "unlocked but not claimed", we might just update valid records.
        // For now, let's upsert.

        const reward = await prisma.userReward.upsert({
            where: {
                userId_milestoneMonths: {
                    userId,
                    milestoneMonths: milestone
                }
            },
            update: {
                isClaimed: true,
                claimedAt: new Date(),
                unlockedAt: new Date() // Assume it's unlocked now if not before
            },
            create: {
                userId,
                milestoneMonths: milestone,
                isClaimed: true,
                claimedAt: new Date(),
                unlockedAt: new Date()
            }
        });

        res.status(200).json({
            milestone_months: reward.milestoneMonths,
            unlocked: true,
            claimed: reward.isClaimed,
            unlocked_at: reward.unlockedAt
        });

    } catch (error) {
        next(error);
    }
};

export const listRewards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callerRole = req.headers['x-user-role'] as string;

        if (callerRole !== 'ADMIN') {
            res.status(403).json({ error: 'Forbidden - Admin access required', code: 'FORBIDDEN' });
            return;
        }

        const userId = req.params.userId;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
            res.status(400).json({ error: 'Invalid user ID format. Must be a valid UUID', code: 'BAD_REQUEST' });
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
            res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
            return;
        }

        // Calculate active months from subscription start date
        let monthsActive = 0;
        if (user.subscription && user.subscription.startDate) {
            const now = new Date();
            const start = new Date(user.subscription.startDate);
            monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            if (now.getDate() < start.getDate()) monthsActive--;
            if (monthsActive < 0) monthsActive = 0;
        }

        const milestones = [3, 6, 9, 12];
        const rewards = milestones.map(milestone => {
            const userReward = user.rewards.find(r => r.milestoneMonths === milestone);
            const isUnlocked = monthsActive >= milestone;
            return {
                milestone_months: milestone,
                unlocked: isUnlocked,
                claimed: userReward?.isClaimed ?? false,
                unlocked_at: isUnlocked ? (userReward?.unlockedAt ?? null) : null
            };
        });

        res.status(200).json({
            user_id: userId,
            months_active: monthsActive,
            rewards
        });

    } catch (error) {
        next(error);
    }
};
