import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@lcrc/shared';
import { upsertSubscription } from './adminsubscriptionsControllerService';

// ─────────────────────────────────────────────
// BMC Webhook event types
// ─────────────────────────────────────────────
const BMC_EVENT_STARTED = 'membership.started';
const BMC_EVENT_UPDATED = 'membership.updated';
const BMC_EVENT_CANCELLED = 'membership.cancelled';

// ─────────────────────────────────────────────
// Derive subscription status from BMC event type
// ─────────────────────────────────────────────
function resolveStatus(eventType: string): string {
    switch (eventType) {
        case BMC_EVENT_CANCELLED:
            return 'INACTIVE';
        case BMC_EVENT_STARTED:
        case BMC_EVENT_UPDATED:
        default:
            return 'ACTIVE';
    }
}

// ─────────────────────────────────────────────
// POST /webhooks/bmc
// Called by Buy Me a Coffee when a membership event occurs.
// requires express.raw() middleware (NOT express.json())
// ─────────────────────────────────────────────
export const bmcWebhookHandler = async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.BMC_WEBHOOK_SECRET;

    // ── 1. Signature validation ───────────────
    if (secret) {
        const signature = req.headers['x-signature-sha256'] as string | undefined;

        if (!signature) {
            res.status(401).json({ error: 'Missing X-Signature-Sha256 header' });
            return;
        }

        const rawBody = req.body as Buffer;
        const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        // timingSafeEqual requires equal-length buffers
        // If lengths differ, the signature is definitely invalid
        let sigValid = false;
        if (signature.length === expectedSig.length) {
            const sigBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSig);
            sigValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
        }

        if (!sigValid) {
            console.warn('⚠️  BMC webhook: invalid signature');
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
    } else {
        console.warn('⚠️  BMC_WEBHOOK_SECRET not set — skipping signature validation');
    }

    // ── 2. Parse body ─────────────────────────
    let payload: any;
    try {
        payload = JSON.parse((req.body as Buffer).toString('utf8'));
    } catch {
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
    }

    const { type, event_id: bmcEventId, data } = payload;

    console.log(`🔔 BMC webhook received: ${type} (event_id=${bmcEventId})`);

    const HANDLED_EVENTS = [BMC_EVENT_STARTED, BMC_EVENT_UPDATED, BMC_EVENT_CANCELLED];
    if (!HANDLED_EVENTS.includes(type)) {
        // Acknowledge unhandled events gracefully
        res.status(200).json({ received: true, processed: false });
        console.log(`⚠️  BMC webhook: unhandled event type ${type}`);
        return;
    }

    // ── 2b. Idempotency guard ──────────────────
    if (bmcEventId != null) {
        const eventIdStr = String(bmcEventId);
        const existing = await (prisma as any).bmcWebhookEvent.findUnique({
            where: { eventId: eventIdStr },
        });
        if (existing) {
            console.log(`⚠️  BMC webhook: evento duplicado ignorado event_id=${eventIdStr}`);
            res.status(200).json({ received: true, processed: false, reason: 'duplicate_event' });
            return;
        }
    }

    // ── 3. Resolve user by payer_email ────────
    const payerEmail: string | undefined = data?.payer_email || data?.supporter_email;
    console.log(payerEmail);

    if (!payerEmail) {
        console.warn('⚠️  BMC webhook: no payer_email in payload', data);
        res.status(422).json({ error: 'payer_email not found in payload' });
        return;
    }

    // Try to find by bmcEmail first, then fall back to main email (OR in single query)
    // Note: bmcEmail type will be available in Prisma client after running the migration
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: payerEmail, mode: 'insensitive' } },
                { bmcEmail: { equals: payerEmail, mode: 'insensitive' } },
            ],
        } as any,
    });

    if (!user) {
        console.warn(`⚠️  BMC webhook: no user found for email ${payerEmail}`);
        // Return 200 so BMC doesn't retry — user simply isn't registered yet
        res.status(200).json({ received: true, processed: false, reason: 'user_not_found' });
        return;
    }

    // ── 3b. Sync bmcEmail if it differs from the payload email ────
    const currentBmcEmail = (user as any).bmcEmail as string | null | undefined;
    if (currentBmcEmail?.toLowerCase() !== payerEmail.toLowerCase()) {
        try {
            await (prisma.user as any).update({
                where: { id: user.id },
                data: { bmcEmail: payerEmail },
            });
            console.log(`🔄 BMC webhook: bmcEmail synced → ${payerEmail} for user ${user.id}`);
        } catch (err) {
            // Non-fatal: log and continue with subscription upsert
            console.error('⚠️  BMC webhook: could not sync bmcEmail', err);
        }
    }

    // ── 4. Upsert subscription ─────────────────
    // 🔍 Debug: log all data fields to confirm exact field names from BMC payload
    console.log('🔍 BMC webhook data fields:', JSON.stringify(data, null, 2));

    const status = resolveStatus(type);
    const externalId: string | undefined =
        data?.membership_id != null
            ? String(data.membership_id)
            : data?.supporter_id != null
                ? String(data.supporter_id)
                : undefined;
    console.log(`🔍 externalId resolved: membership_id=${data?.membership_id}, supporter_id=${data?.supporter_id} → ${externalId}`);

    // BMC sends dates as Unix timestamps in SECONDS — multiply by 1000 for JS Date
    const fromUnix = (ts: number | undefined | null): Date | undefined =>
        ts != null ? new Date(ts * 1000) : undefined;

    const membershipStartedAt: Date | undefined = fromUnix(data?.started_at);
    const membershipEndsAt: Date | undefined = fromUnix(data?.current_period_end ?? data?.cancelled_at);
    const lastPaymentAt: Date | undefined = fromUnix(data?.current_period_start);

    try {
        const subscription = await upsertSubscription({
            userId: user.id,
            status,
            startDate: membershipStartedAt,
            endDate: membershipEndsAt,
            externalId,
            lastPaymentDate: lastPaymentAt,
        });

        console.log(`✅ BMC webhook: subscription updated for user ${user.id} → ${status}`);

        // ── 5. Registrar evento procesado (idempotencia) ──────────
        if (bmcEventId != null) {
            const eventIdStr = String(bmcEventId);
            try {
                await (prisma as any).bmcWebhookEvent.create({
                    data: {
                        eventId: eventIdStr,
                        eventType: type,
                        subscriptionId: subscription.id,
                    },
                });
                console.log(`📝 BMC webhook: event_id=${eventIdStr} registrado en bmc_webhook_events`);
            } catch (regErr) {
                // No-fatal: si falla el registro (ej. raza de condición con event_id único),
                // el upsert ya se ejecutó; solo logueamos.
                console.error('⚠️  BMC webhook: no se pudo registrar el evento', regErr);
            }
        }

        res.status(200).json({
            received: true,
            processed: true,
            subscription_id: subscription.id,
            user_id: user.id,
            status,
        });
    } catch (err) {
        console.error('❌ BMC webhook: error upserting subscription', err);
        res.status(500).json({ error: 'Internal error processing webhook' });
    }
};