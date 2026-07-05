import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '@lcrc/shared';

export const createStripeCheckoutSession = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error('❌ Stripe checkout session creation failed: STRIPE_SECRET_KEY not set');
            res.status(500).json({ error: 'Stripe not configured' });
            return;
        }

        const user = req.user;
        if (!user || !user.id) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { priceId, successUrl, cancelUrl } = req.body;
        if (!priceId) {
            res.status(400).json({ error: 'Missing priceId parameter' });
            return;
        }

        const stripe = new Stripe(stripeSecretKey);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const finalSuccessUrl = successUrl || `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const finalCancelUrl = cancelUrl || `${frontendUrl}/checkout/cancel`;

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: user.email || undefined,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: finalSuccessUrl,
            cancel_url: finalCancelUrl,
            metadata: {
                userId: user.id,
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                },
            },
        });

        res.status(200).json({
            sessionId: session.id,
            url: session.url,
        });
    } catch (error: any) {
        console.error('❌ Error creating Stripe checkout session:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

export const cancelSubscription = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error('❌ Stripe subscription cancellation failed: STRIPE_SECRET_KEY not set');
            res.status(500).json({ error: 'Stripe not configured' });
            return;
        }

        const user = req.user;
        if (!user || !user.id) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Fetch subscription from DB to get the external Stripe Subscription ID
        const dbSub = await prisma.subscription.findUnique({
            where: { userId: user.id },
        });

        if (!dbSub || !dbSub.externalId) {
            res.status(400).json({ error: 'No active Stripe subscription found for this user' });
            return;
        }

        const stripe = new Stripe(stripeSecretKey);

        // Cancel the subscription at the period end
        const stripeSub = await stripe.subscriptions.update(dbSub.externalId, {
            cancel_at_period_end: true,
        });

        // Persist cancel_at_period_end in local DB
        await prisma.subscription.update({
            where: { userId: user.id },
            data: { cancelAtPeriodEnd: stripeSub.cancel_at_period_end },
        });

        console.log(`✅ Stripe subscription ${dbSub.externalId} marked for cancellation at period end`);

        res.status(200).json({
            message: 'Subscription successfully scheduled for cancellation at the end of the period',
            cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
        });
    } catch (error: any) {
        console.error('❌ Error cancelling Stripe subscription:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
