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
    'charge.succeeded',
    'charge.refunded',
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
        } else if (event.type === 'charge.succeeded') {
            await handleChargeSucceeded(event, stripe);
        } else if (event.type === 'charge.refunded') {
            await handleChargeRefunded(event, stripe);
        }

        res.status(200).json({ received: true, processed: true });
    } catch (err) {
        console.error('❌ Stripe webhook: error processing event', err);
        res.status(500).json({ error: 'Internal error processing webhook' });
    }
};

// ─────────────────────────────────────────────
// Store charge → subscription mapping.
// Used by both charge.succeeded and as fallback in charge.refunded.
// Idempotent via chargeId unique constraint.
// ─────────────────────────────────────────────
async function storeSubscriptionCharge(chargeId: string, stripeSubId: string, amount: number): Promise<void> {
    await (prisma as any).subscriptionCharge.upsert({
        where: { chargeId },
        update: { subscriptionId: stripeSubId, amount },
        create: { chargeId, subscriptionId: stripeSubId, amount },
    });
    console.log(`📝 Stored charge mapping: ${chargeId} → subscription ${stripeSubId}`);
}

// ─────────────────────────────────────────────
// Store charge mapping AND tag PaymentIntent metadata for fast-path resolution.
// Called from both checkout completion and invoice payment succeeded flows.
// ─────────────────────────────────────────────
async function mapChargeAndTagPaymentIntent(
    piId: string,
    chargeId: string,
    amount: number,
    appSubscriptionId: string,
    stripeSubId: string,
    stripe: Stripe
): Promise<void> {
    await storeSubscriptionCharge(chargeId, stripeSubId, amount);

    try {
        await stripe.paymentIntents.update(piId, {
            metadata: { appSubscriptionId },
        });
    } catch (err) {
        console.warn(
            `⚠️ could not tag PaymentIntent ${piId} with appSubscriptionId — will rely on fallback resolution`,
            err
        );
    }
}

// ─────────────────────────────────────────────
// Resolve the Stripe subscription ID from a charge object.
// In Dahlia API (2026+):
//   - charge.invoice         → removed
//   - payment_intent.invoice → removed
//   - invoices.list({payment_intent}) → removed
//   - invoice.subscription   → removed from event payload
//
// Strategy: charge.customer → subscriptions.list → verify via latest_invoice
// ─────────────────────────────────────────────
async function resolveSubscriptionFromCharge(charge: any, stripe: Stripe): Promise<string | null> {
    // ── Fast path: PaymentIntent metadata ──────────────────────
    if (charge.payment_intent && typeof charge.payment_intent === 'string') {
        try {
            const pi = await stripe.paymentIntents.retrieve(charge.payment_intent) as any;
            const appSubscriptionId = pi.metadata?.appSubscriptionId;
            if (appSubscriptionId) {
                const dbSub = await prisma.subscription.findUnique({
                    where: { id: appSubscriptionId },
                });
                if (dbSub?.externalId) {
                    console.log(`✅ Resolved subscription ${dbSub.externalId} via metadata (fast path)`);
                    return dbSub.externalId;
                }
            }
        } catch (err) {
            console.warn(`⚠️ Could not retrieve PaymentIntent ${charge.payment_intent} for metadata`, err);
        }
    }

    // ── Fallback: customer → subscriptions.list ────────────────
    if (!charge.customer || typeof charge.customer !== 'string') return null;

    try {
        const subs = await stripe.subscriptions.list({ customer: charge.customer, limit: 5, status: 'all' }) as any;

        for (const sub of subs.data ?? []) {
            const known = await prisma.subscription.findFirst({
                where: { externalId: sub.id, provider: 'stripe' },
            });
            if (known) {
                console.log(`✅ Resolved subscription ${sub.id} via DB lookup (fallback)`);
                return sub.id;
            }

            if (!sub.latest_invoice) continue;
            const invId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id;
            try {
                const inv = await stripe.invoices.retrieve(invId) as any;
                const payments = inv.payments ?? [];
                for (const entry of payments) {
                    const payment = entry.payment;
                    if (!payment || payment.type !== 'payment_intent') continue;
                    const piId = typeof payment.payment_intent === 'string'
                        ? payment.payment_intent
                        : payment.payment_intent?.id ?? null;
                    if (piId === charge.payment_intent) {
                        console.log(`✅ Resolved subscription ${sub.id} via invoice verification (fallback)`);
                        return sub.id;
                    }
                }
            } catch {
                // skip
            }
        }
    } catch (err) {
        console.warn(`⚠️ resolveSubscriptionFromCharge — subscriptions.list failed for customer ${charge.customer}`, err);
    }

    return null;
}

// ─────────────────────────────────────────────
// Handler: charge.succeeded
// Stores charge → subscription mapping for future refund resolution.
// In Basil API, charge.invoice and payment_intent.invoice are removed,
// so we resolve via invoices.list({payment_intent}) instead.
// ─────────────────────────────────────────────
async function handleChargeSucceeded(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const charge = event.data.object as any;

    const existing = await (prisma as any).subscriptionCharge.findUnique({
        where: { chargeId: charge.id },
    });
    if (existing) {
        console.log(`⏭️  charge.succeeded — charge=${charge.id}, mapping already exists, skipping`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    const stripeSubId = await resolveSubscriptionFromCharge(charge, stripe);
    if (stripeSubId) {
        await storeSubscriptionCharge(charge.id, stripeSubId, charge.amount);

        const dbSub = await prisma.subscription.findFirst({
            where: { externalId: stripeSubId, provider: 'stripe' },
        });
        await registerStripeEvent(event.id, event.type, dbSub?.id);

        console.log(`✅ charge.succeeded — stored mapping for charge ${charge.id} → sub ${stripeSubId}`);
    } else {
        console.log(`⏭️  charge.succeeded — charge=${charge.id}, could not resolve subscription, skipping`);
        await registerStripeEvent(event.id, event.type);
    }
}

// ─────────────────────────────────────────────
// Helper: upsert SubscriptionCharge row and deactivate subscription
// ─────────────────────────────────────────────
async function deactivateSubscriptionForCharge(stripeSubId: string): Promise<void> {
    const dbSub = await prisma.subscription.findFirst({
        where: { externalId: stripeSubId },
    });

    if (!dbSub) {
        console.log(`⏭️  deactivateSubscriptionForCharge — no local subscription found for ${stripeSubId}, skipping`);
        return;
    }

    if (dbSub.status === 'INACTIVE' || (dbSub as any).refundedAt) {
        console.log(`⏭️  deactivateSubscriptionForCharge — subscription ${dbSub.id} already inactive/refunded, skipping`);
        return;
    }

    await upsertSubscription({
        userId: dbSub.userId,
        status: 'INACTIVE',
        cancelAtPeriodEnd: false,
        refundedAt: new Date(),
    });

    console.log(`✅ deactivateSubscriptionForCharge — subscription ${dbSub.id} deactivated`);
}

// ─────────────────────────────────────────────
// Handler: charge.refunded
// Looks up subscription via SubscriptionCharge table (fast path).
// Falls back to API resolution if mapping not found (transition period).
// Updates refundedAmount/refundedAt on the mapping row.
// Partial refunds are silently ignored.
// ─────────────────────────────────────────────
async function handleChargeRefunded(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const eventCharge = event.data.object as any;

    // Retrieve the full charge from the API for accurate amount_refunded
    const charge = await stripe.charges.retrieve(eventCharge.id) as any;

    // Skip partial refunds — only full refunds deactivate the subscription
    if (!charge.refunded || charge.amount_refunded < charge.amount) {
        // Still update refundedAmount on the mapping row for tracking
        const sc = await (prisma as any).subscriptionCharge.findUnique({
            where: { chargeId: charge.id },
        });
        if (sc) {
            await (prisma as any).subscriptionCharge.update({
                where: { chargeId: charge.id },
                data: { refundedAmount: charge.amount_refunded, refundedAt: null },
            });
        }
        console.log(`⏭️  charge.refunded — partial refund (${charge.amount_refunded}/${charge.amount}), skipping deactivation`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    // ── Fast path: look up via our mapping table ──────
    let sc = await (prisma as any).subscriptionCharge.findUnique({
        where: { chargeId: charge.id },
    });

    // ── Fallback path: resolve via API ────────────────
    if (!sc) {
        console.log(`⚠️  charge.refunded — charge=${charge.id}, no local mapping, attempting API resolution`);
        const stripeSubId = await resolveSubscriptionFromCharge(charge, stripe);
        if (stripeSubId) {
            await storeSubscriptionCharge(charge.id, stripeSubId, charge.amount);
            sc = { chargeId: charge.id, subscriptionId: stripeSubId };
        }
    }

    if (!sc) {
        console.log(`⏭️  charge.refunded — charge=${charge.id}, could not resolve subscription, skipping`);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    // Update refund tracking on the mapping row
    await (prisma as any).subscriptionCharge.update({
        where: { chargeId: charge.id },
        data: { refundedAmount: charge.amount_refunded, refundedAt: new Date() },
    });

    console.log(`💰 charge.refunded — full refund for subscription ${sc.subscriptionId}, deactivating`);
    await deactivateSubscriptionForCharge(sc.subscriptionId);
    await registerStripeEvent(event.id, event.type);
}

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

    // Tag PaymentIntent metadata for fast-path resolution
    if (session.subscription && typeof session.subscription === 'string') {
        try {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
            if (stripeSub.latest_invoice) {
                const invId = typeof stripeSub.latest_invoice === 'string'
                    ? stripeSub.latest_invoice
                    : stripeSub.latest_invoice.id;
                const inv = await stripe.invoices.retrieve(invId) as any;
                const payments = inv.payments ?? [];
                for (const entry of payments) {
                    const payment = entry.payment;
                    if (!payment || payment.type !== 'payment_intent') continue;
                    const piId = typeof payment.payment_intent === 'string'
                        ? payment.payment_intent
                        : payment.payment_intent?.id ?? null;
                    if (!piId) continue;

                    const pi = await stripe.paymentIntents.retrieve(piId) as any;
                    const chargeId = pi.latest_charge ?? undefined;
                    if (chargeId) {
                        await mapChargeAndTagPaymentIntent(
                            piId, chargeId, pi.amount_received ?? pi.amount,
                            subscription.id, stripeSub.id, stripe
                        );
                    }
                }
            }
        } catch (err) {
            console.warn(`⚠️ Could not tag PaymentIntent metadata for session ${session.id}`, err);
        }
    }
}

// ─────────────────────────────────────────────
// Handler: invoice.payment_succeeded
// In Dahlia API, invoice.subscription is removed from the event payload,
// so we retrieve the full invoice from the API.
// ─────────────────────────────────────────────
async function handleInvoicePaymentSucceeded(event: Stripe.Event, stripe: Stripe): Promise<void> {
    const eventInvoice = event.data.object as any;
    console.log(`💳 invoice.payment_succeeded — invoice=${eventInvoice.id}`);

    // Retrieve the full invoice from API — event payload may omit fields
    let invoice: any;
    try {
        invoice = await stripe.invoices.retrieve(eventInvoice.id) as any;
    } catch (err) {
        console.warn(`⚠️  invoice.payment_succeeded — could not retrieve invoice ${eventInvoice.id}`, err);
        await registerStripeEvent(event.id, event.type);
        return;
    }

    let subscriptionId = invoice.subscription;

    // Fallback: resolve subscription via invoice.customer
    if (!subscriptionId || typeof subscriptionId !== 'string') {
        console.log(`📝 invoice.payment_succeeded — invoice ${invoice.id} has no subscription field, resolving via customer`);
        const subs = await stripe.subscriptions.list({ customer: invoice.customer, limit: 1, status: 'all' }) as any;
        subscriptionId = subs.data?.[0]?.id ?? null;
    }

    if (!subscriptionId || typeof subscriptionId !== 'string') {
        console.log(`📝 Stripe webhook: invoice.payment_succeeded — no subscription resolved for invoice ${invoice.id}`);
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

    // Store charge → subscription mappings and tag PaymentIntent metadata
    if (invoice.payments && Array.isArray(invoice.payments)) {
        for (const entry of invoice.payments) {
            const payment = entry.payment;
            if (!payment) continue;

            let piId: string | null = null;
            if (payment.type === 'payment_intent' && payment.payment_intent) {
                piId = typeof payment.payment_intent === 'string'
                    ? payment.payment_intent
                    : payment.payment_intent.id ?? null;
            }
            if (!piId) continue;

            try {
                const pi = await stripe.paymentIntents.retrieve(piId) as any;
                const chargeId: string | undefined = pi.latest_charge ?? undefined;
                if (chargeId) {
                    await mapChargeAndTagPaymentIntent(
                        piId, chargeId, pi.amount_received ?? pi.amount,
                        subscription.id, stripeSub.id, stripe
                    );
                }
            } catch (err) {
                console.warn(`⚠️  invoice.payment_succeeded — could not process payment_intent ${piId}`, err);
            }
        }
    }
}
