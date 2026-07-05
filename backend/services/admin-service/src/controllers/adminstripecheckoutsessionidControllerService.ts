import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';

export const getCheckoutSession = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            console.error('❌ Stripe checkout session retrieval failed: STRIPE_SECRET_KEY not set');
            res.status(500).json({ error: 'Stripe not configured' });
            return;
        }

        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ error: 'Missing sessionId parameter' });
            return;
        }

        const stripe = new Stripe(stripeSecretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        res.status(200).json({
            id: session.id,
            status: session.status,
            payment_status: session.payment_status,
            url: session.url,
            customer_email: session.customer_details?.email || null,
            amount_total: session.amount_total,
            currency: session.currency,
            metadata: session.metadata,
            created: session.created,
            expires_at: session.expires_at,
        });
    } catch (error: any) {
        console.error('❌ Error retrieving Stripe checkout session:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};