import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';

// ─────────────────────────────────────────────
// Shared upsert logic (used by admin endpoint and BMC webhook)
// ─────────────────────────────────────────────
export interface UpsertSubscriptionInput {
    userId: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    externalId?: string;
    lastPaymentDate?: Date;
}

export const upsertSubscription = async (input: UpsertSubscriptionInput) => {
    const { userId, status, startDate, endDate, externalId, lastPaymentDate } = input;

    return prisma.subscription.upsert({
        where: { userId },
        update: {
            // status se omite si no viene explícitamente → Prisma preserva el valor actual en BD
            ...(status !== undefined && { status }),
            startDate: startDate ?? undefined,
            endDate: endDate ?? undefined,
            externalId: externalId ?? undefined,
            lastPaymentDate: lastPaymentDate ?? undefined,
        },
        create: {
            userId,
            status: status ?? 'ACTIVE',
            startDate: startDate ?? new Date(),
            endDate: endDate ?? undefined,
            externalId: externalId ?? undefined,
            lastPaymentDate: lastPaymentDate ?? undefined,
            provider: 'buymeacoffee',
        },
    });
};

// ─────────────────────────────────────────────
// Admin endpoint: POST /admin/subscriptions
// ─────────────────────────────────────────────
export const createOrUpdateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.query.user_id as string;
        const { status, start_date, end_date, external_id, last_payment_date } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'Missing user_id parameter' });
            return;
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const subscription = await upsertSubscription({
            userId,
            status,
            startDate: start_date ? new Date(start_date) : undefined,
            endDate: end_date ? new Date(end_date) : undefined,
            externalId: external_id,
            lastPaymentDate: last_payment_date ? new Date(last_payment_date) : undefined,
        });

        res.status(200).json({
            id: subscription.id,
            user_id: subscription.userId,
            status: subscription.status,
            start_date: subscription.startDate,
            end_date: subscription.endDate,
            last_payment_date: subscription.lastPaymentDate,
            provider: subscription.provider,
            external_id: subscription.externalId,
        });

    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// Admin endpoint: GET /admin/subscriptions
// ─────────────────────────────────────────────
export const listSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const status = req.query.status as string | undefined;
        const userId = req.query.user_id as string | undefined;

        const where: any = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        const [total, subscriptions] = await prisma.$transaction([
            prisma.subscription.count({ where }),
            prisma.subscription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const mappedSubscriptions = subscriptions.map(sub => ({
            id: sub.id,
            user_id: sub.userId,
            status: sub.status,
            start_date: sub.startDate,
            end_date: sub.endDate,
            last_payment_date: sub.lastPaymentDate,
            provider: sub.provider,
            external_id: sub.externalId,
        }));

        res.status(200).json({
            subscriptions: mappedSubscriptions,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};
