import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '@lcrc/shared';
import { upsertSubscription } from './adminsubscriptionsControllerService';

// ─────────────────────────────────────────────
// Stripe event types handled
// ─────────────────────────────────────────────
const HANDLED_EVENTS: Stripe.Event.Type[] = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
];

// ─────────────────────────────────────────────
// Derive subscription status from Stripe subscription object
// ─────────────────────────────────────────────
function resolveStatusFromSubscription(sub: Stripe.Subscription): string {
    switch (sub.status) {
        case 'active':
        case 'trialing':
            return 'ACTIVE';
        case 'canceled':
        case 'unpaid':
        case 'incomplete_expired':
            return 'INACTIVE';
        case 'past_due':
        case 'incomplete':
            return 'PAST_DUE';
        default:
            return 'INACTIVE';
    }
}

// ─────────────────────────────────────────────
// Helper: extract dates from Stripe subscription object
// ─────────────────────────────────────────────
function getStripeSubscriptionDates(stripeSub: Stripe.Subscription): {
    startDate?: Date;
    endDate?: Date;
    lastPaymentDate?: Date;
} {
    const stripeItem = stripeSub.items?.data?.[0] as any;

    const startDate =
        (stripeSub as any).start_date
            ? new Date((stripeSub as any).start_date * 1000)
            : stripeItem?.current_period_start
                ? new Date(stripeItem.current_period_start * 1000)
                : undefined;

    const endDate =
        stripeItem?.current_period_end
            ? new Date(stripeItem.current_period_end * 1000)
            : (stripeSub as any).current_period_end
                ? new Date((stripeSub as any).current_period_end * 1000)
                : undefined;

    const lastPaymentDate =
        stripeItem?.current_period_start
            ? new Date(stripeItem.current_period_start * 1000)
            : (stripeSub as any).current_period_start
                ? new Date((stripeSub as any).current_period_start * 1000)
                : undefined;

    return { startDate, endDate, lastPaymentDate };
}


// ─────────────────────────────────────────────
// Register idempotency record in stripe_webhook_events
// ─────────────────────────────────────────────
async function registerStripeEvent(
    eventId: string,
    eventType: string,
    subscriptionId?: string
): Promise<void> {
    await (prisma as any).stripeWebhookEvent.create({
        data: {
            eventId,
            eventType,
            ...(subscriptionId && { subscriptionId }),
        },
    });
    console.log(`📝 Stripe webhook: event_id=${eventId} registered in stripe_webhook_events`);
}

// ─────────────────────────────────────────────
// POST /admin/webhooks/stripe
// Called by Stripe when a payment/subscription event occurs.
// Requires express.raw() middleware (NOT express.json())
// ─────────────────────────────────────────────
export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        console.error('❌ Stripe webhook: STRIPE_SECRET_KEY not set');
        res.status(500).json({ error: 'Stripe not configured' });
        return;
    }

    const stripe = new Stripe(stripeSecretKey);
    const rawBody = req.body as Buffer;
    const signature = req.headers['stripe-signature'] as string | undefined;

    // ── 1. Signature validation ───────────────
    let event: Stripe.Event;
    if (secret) {
        if (!signature) {
            console.warn('⚠️  Stripe webhook: missing stripe-signature header');
            res.status(401).json({ error: 'Missing stripe-signature header' });
            return;
        }
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, secret);
        } catch (err: any) {
            console.warn(`⚠️  Stripe webhook: invalid signature — ${err.message}`);
            res.status(401).json({ error: `Webhook signature verification failed: ${err.message}` });
            return;
        }
    } else {
        // Dev/test mode: skip signature check
        console.warn('⚠️  STRIPE_WEBHOOK_SECRET not set — skipping signature validation');
        try {
            event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
        } catch {
            res.status(400).json({ error: 'Invalid JSON payload' });
            return;
        }
    }

    console.log(`🔔 Stripe webhook received: ${event.type} (event_id=${event.id})`);

    // ── 2. Filter unhandled events ────────────
    if (!HANDLED_EVENTS.includes(event.type as Stripe.Event.Type)) {
        res.status(200).json({ received: true, processed: false });
        console.log(`⚠️  Stripe webhook: unhandled event type ${event.type}`);
        return;
    }

    // ── 3. Idempotency guard ──────────────────
    const existing = await (prisma as any).stripeWebhookEvent.findUnique({
        where: { eventId: event.id },
    });
    if (existing) {
        console.log(`⚠️  Stripe webhook: evento duplicado ignorado event_id=${event.id}`);
        res.status(200).json({ received: true, processed: false, reason: 'duplicate_event' });
        return;
    }

    // ── 4. Process event ──────────────────────
    try {
        if (event.type === 'checkout.session.completed') {
            await handleCheckoutSessionCompleted(event, stripe);
        } else if (
            event.type === 'customer.subscription.created' ||
            event.type === 'customer.subscription.updated' ||
            event.type === 'customer.subscription.deleted'
        ) {
            await handleSubscriptionChange(event, stripe);
        } else if (event.type === 'invoice.payment_succeeded') {
            await handleInvoicePaymentSucceeded(event, stripe);
        }

        res.status(200).json({ received: true, processed: true });
    } catch (err) {
        console.error('❌ Stripe webhook: error processing event', err);
        res.status(500).json({ error: 'Internal error processing webhook' });
    }
};

// ─────────────────────────────────────────────
// Handler: checkout.session.completed
// ─────────────────────────────────────────────
async function handleCheckoutSessionCompleted(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    // userId must be passed in session metadata when creating the Checkout Session
    const userId: string | undefined =
        session.metadata?.userId ?? session.metadata?.user_id ?? undefined;
    const customerEmail: string | null = session.customer_details?.email ?? null;

    console.log(`💳 checkout.session.completed — session=${session.id}, userId=${userId}, email=${customerEmail}`);

    let resolvedUserId = userId;

    if (!resolvedUserId && customerEmail) {
        // Fallback: find user by email
        const userByEmail = await prisma.user.findFirst({
            where: { email: { equals: customerEmail, mode: 'insensitive' } },
        });
        resolvedUserId = userByEmail?.id;
    }

    if (!resolvedUserId) {
        console.warn('⚠️  Stripe webhook: cannot resolve user — no userId in metadata and no matching email');
        await registerStripeEvent(event.id, event.type);
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: resolvedUserId } });
    if (!user) {
        console.warn(`⚠️  Stripe webhook: no user found for id ${resolvedUserId}`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    await upsertStripeSubscription({ userId: resolvedUserId, session, stripe, eventId: event.id, eventType: event.type });
}

// ─────────────────────────────────────────────
// Handler: customer.subscription.updated / deleted
// ─────────────────────────────────────────────
async function handleSubscriptionChange(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const stripeSub = event.data.object as Stripe.Subscription;

    // Prefer userId from metadata (set when creating the subscription)
    const userId: string | undefined =
        stripeSub.metadata?.userId ?? stripeSub.metadata?.user_id ?? undefined;

    let resolvedUserId: string | undefined = userId;

    if (!resolvedUserId) {
        // Fallback: resolve user from Stripe customer email
        let customerEmail: string | null = null;
        if (typeof stripeSub.customer === 'string') {
            try {
                const customer = await stripe.customers.retrieve(stripeSub.customer) as Stripe.Customer;
                customerEmail = customer.email ?? null;
            } catch (err) {
                console.warn('⚠️  Stripe webhook: could not retrieve customer', err);
            }
        }
        if (customerEmail) {
            const userByEmail = await prisma.user.findFirst({
                where: { email: { equals: customerEmail, mode: 'insensitive' } },
            });
            resolvedUserId = userByEmail?.id;
        }
    }

    if (!resolvedUserId) {
        console.warn(`⚠️  Stripe webhook: cannot resolve user for subscription ${stripeSub.id}`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    const status = resolveStatusFromSubscription(stripeSub);
    const { startDate, endDate, lastPaymentDate } = getStripeSubscriptionDates(stripeSub);


    console.log(`📝 Updating subscription dates via change for user ${resolvedUserId}: status=${status}, startDate=${startDate?.toISOString()}, endDate=${endDate?.toISOString()}, lastPaymentDate=${lastPaymentDate?.toISOString()}`);

    const subscription = await upsertSubscription({
        userId: resolvedUserId,
        status,
        startDate,
        endDate,
        externalId: stripeSub.id,
        lastPaymentDate,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });

    // Mark provider as stripe
    await prisma.subscription.update({
        where: { userId: resolvedUserId },
        data: { provider: 'stripe' },
    });

    console.log(`✅ Stripe webhook: subscription ${event.type} for user ${resolvedUserId} → ${status}`);
    await registerStripeEvent(event.id, event.type, subscription.id);
}

// ─────────────────────────────────────────────
// Helper: upsert subscription from a checkout session
// ─────────────────────────────────────────────
async function upsertStripeSubscription(params: {
    userId: string;
    session: Stripe.Checkout.Session;
    stripe: Stripe;
    eventId: string;
    eventType: string;
}): Promise<void> {
    const { userId, session, stripe, eventId, eventType } = params;

    let startDate: Date = new Date();
    let endDate: Date | undefined;
    let lastPaymentDate: Date = new Date();
    let externalId: string = session.id;
    let stripeStatus = 'ACTIVE';
    let cancelAtPeriodEnd = false;

    // If the session is subscription-mode, fetch the Stripe subscription for exact dates
    if (session.subscription && typeof session.subscription === 'string') {
        try {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
            externalId = stripeSub.id;
            stripeStatus = resolveStatusFromSubscription(stripeSub);
            cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
            const periodDates = getStripeSubscriptionDates(stripeSub);

            startDate = periodDates.startDate ?? startDate;
            endDate = periodDates.endDate;
            lastPaymentDate = periodDates.lastPaymentDate ?? lastPaymentDate;
        } catch (err) {
            console.warn('⚠️  Stripe webhook: could not retrieve subscription details, using session id as externalId', err);
            externalId = session.subscription;
        }
    }

    console.log(`📝 Creating/updating subscription via checkout for user ${userId}: status=${stripeStatus}, startDate=${startDate.toISOString()}, endDate=${endDate?.toISOString()}, lastPaymentDate=${lastPaymentDate.toISOString()}`);


    const subscription = await upsertSubscription({
        userId,
        status: stripeStatus,
        startDate,
        endDate,
        externalId,
        lastPaymentDate,
        cancelAtPeriodEnd,
    });

    // Mark provider as stripe
    await prisma.subscription.update({
        where: { userId },
        data: { provider: 'stripe' },
    });

    console.log(`✅ Stripe webhook: subscription created/updated for user ${userId} → ${stripeStatus}`);
    await registerStripeEvent(eventId, eventType, subscription.id);
}

// ─────────────────────────────────────────────
// Handler: invoice.payment_succeeded
// ─────────────────────────────────────────────
async function handleInvoicePaymentSucceeded(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription;

    if (!subscriptionId || typeof subscriptionId !== 'string') {
        console.log(`📝 Stripe webhook: invoice.payment_succeeded — no subscription in invoice ${invoice.id}`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    console.log(`💳 invoice.payment_succeeded — invoice=${invoice.id}, subscription=${subscriptionId}`);

    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

    const userId: string | undefined =
        stripeSub.metadata?.userId ?? stripeSub.metadata?.user_id ?? undefined;

    let resolvedUserId: string | undefined = userId;

    if (!resolvedUserId) {
        let customerEmail: string | null = null;
        if (typeof stripeSub.customer === 'string') {
            try {
                const customer = await stripe.customers.retrieve(stripeSub.customer) as Stripe.Customer;
                customerEmail = customer.email ?? null;
            } catch (err) {
                console.warn('⚠️  Stripe webhook: could not retrieve customer', err);
            }
        }
        if (customerEmail) {
            const userByEmail = await prisma.user.findFirst({
                where: { email: { equals: customerEmail, mode: 'insensitive' } },
            });
            resolvedUserId = userByEmail?.id;
        }
    }

    if (!resolvedUserId) {
        console.warn(`⚠️  Stripe webhook: cannot resolve user for subscription ${subscriptionId}`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    const status = resolveStatusFromSubscription(stripeSub);
    const { startDate, endDate, lastPaymentDate } = getStripeSubscriptionDates(stripeSub);

    console.log(`📝 Updating subscription dates via invoice for user ${resolvedUserId}: status=${status}, startDate=${startDate?.toISOString()}, endDate=${endDate?.toISOString()}, lastPaymentDate=${lastPaymentDate?.toISOString()}`);

    const subscription = await upsertSubscription({
        userId: resolvedUserId,
        status,
        startDate,
        endDate,
        externalId: stripeSub.id,
        lastPaymentDate,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });

    await prisma.subscription.update({
        where: { userId: resolvedUserId },
        data: { provider: 'stripe' },
    });

    console.log(`✅ Stripe webhook: subscription payment succeeded for user ${resolvedUserId} → ${status}`);
    await registerStripeEvent(event.id, event.type, subscription.id);
}
