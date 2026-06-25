/**
 * Integration tests for Stripe Webhook endpoint
 *
 * Uses stripe.webhooks.generateTestHeaderString to produce real Stripe
 * signatures without hitting the Stripe API, and mocks Prisma so no DB is needed.
 *
 * Run: npm test (from admin-service directory)
 */

import request from 'supertest';
import express from 'express';
import Stripe from 'stripe';
import { stripeWebhookHandler } from '../controllers/stripeWebhookController';
import { prisma } from '@lcrc/shared';

// ─── Stripe test helpers ───────────────────────────────────────────────────────
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!; // 'whsec_test_dummy_secret' from setup.ts
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

// Use a shared Stripe instance just to call generateTestHeaderString (no API calls)
const stripe = new Stripe(STRIPE_SECRET_KEY);

/**
 * Serializes payload and generates a real Stripe-compatible stripe-signature header.
 * This is the same mechanism stripe.webhooks.constructEvent uses to verify.
 */
function buildSignedStripeRequest(payload: object): { bodyStr: string; stripeSignature: string } {
    const bodyStr = JSON.stringify(payload);
    const stripeSignature = stripe.webhooks.generateTestHeaderString({
        payload: bodyStr,
        secret: WEBHOOK_SECRET,
    });
    return { bodyStr, stripeSignature };
}

// ─── Minimal express app (webhook route only) ─────────────────────────────────
function buildApp() {
    const app = express();
    app.post('/admin/webhooks/stripe', express.raw({ type: '*/*' }), stripeWebhookHandler);
    return app;
}

// ─── Mock references ──────────────────────────────────────────────────────────
const mockUserFindUnique    = prisma.user.findUnique as jest.Mock;
const mockUserFindFirst     = prisma.user.findFirst as jest.Mock;
const mockSubscriptionUpsert = prisma.subscription.upsert as jest.Mock;
const mockSubscriptionUpdate = prisma.subscription.update as jest.Mock;
const mockStripeEventFindUnique = (prisma as any).stripeWebhookEvent.findUnique as jest.Mock;
const mockStripeEventCreate     = (prisma as any).stripeWebhookEvent.create as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const MOCK_USER = {
    id: 'user-uuid-stripe-001',
    email: 'stripe-member@example.com',
};

const MOCK_SUBSCRIPTION = {
    id: 'sub-uuid-stripe-001',
    userId: MOCK_USER.id,
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-01'),
    lastPaymentDate: new Date('2026-01-01'),
    provider: 'stripe',
    externalId: 'sub_stripe_001',
    createdAt: new Date(),
    updatedAt: new Date(),
};

/** Stripe Checkout Session payload (subscription mode) */
function makeCheckoutSessionPayload(overrides: object = {}): object {
    return {
        id: 'evt_test_checkout_001',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_001',
                object: 'checkout.session',
                mode: 'subscription',
                subscription: null,           // null = one-time / no sub object for simple tests
                customer_details: { email: MOCK_USER.email },
                metadata: { userId: MOCK_USER.id },
                ...overrides,
            },
        },
    };
}

/** Stripe Subscription Updated payload */
function makeSubscriptionUpdatedPayload(status = 'active', overrides: object = {}): object {
    return {
        id: 'evt_test_sub_updated_001',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
            object: {
                id: 'sub_stripe_001',
                object: 'subscription',
                status,
                start_date: 1735689600,          // 2026-01-01 Unix
                current_period_start: 1735689600,
                current_period_end: 1738368000,  // 2026-02-01 Unix
                customer: 'cus_test_001',
                metadata: { userId: MOCK_USER.id },
                ...overrides,
            },
        },
    };
}

/** Stripe Subscription Deleted payload */
function makeSubscriptionDeletedPayload(): object {
    return {
        id: 'evt_test_sub_deleted_001',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
            object: {
                id: 'sub_stripe_001',
                object: 'subscription',
                status: 'canceled',
                start_date: 1735689600,
                current_period_start: 1735689600,
                current_period_end: 1738368000,
                customer: 'cus_test_001',
                metadata: { userId: MOCK_USER.id },
            },
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /admin/webhooks/stripe', () => {
    let app: express.Express;

    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
        // Default: event never seen before
        mockStripeEventFindUnique.mockResolvedValue(null);
        mockStripeEventCreate.mockResolvedValue({});
        // Default: subscription update always succeeds
        mockSubscriptionUpdate.mockResolvedValue(MOCK_SUBSCRIPTION);
    });

    // ── Security: Signature validation ────────────────────────────────────────

    describe('Signature validation', () => {
        it('returns 401 when stripe-signature header is missing', async () => {
            const payload = makeCheckoutSessionPayload();
            const bodyStr = JSON.stringify(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/Missing stripe-signature/i);
        });

        it('returns 401 when signature is tampered (wrong secret)', async () => {
            const payload = makeCheckoutSessionPayload();
            const bodyStr = JSON.stringify(payload);

            // Generate signature with a DIFFERENT secret
            const tamperedSig = stripe.webhooks.generateTestHeaderString({
                payload: bodyStr,
                secret: 'whsec_totally_wrong_secret',
            });

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', tamperedSig)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/signature verification failed/i);
        });

        it('returns 401 when body is modified after signing', async () => {
            const payload = makeCheckoutSessionPayload();
            const { stripeSignature } = buildSignedStripeRequest(payload);
            // Body is tampered after generating signature
            const tamperedBody = JSON.stringify({ ...payload, tampered: true });

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(tamperedBody));

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/signature verification failed/i);
        });

        it('accepts a correctly signed request', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);
            const payload = makeCheckoutSessionPayload();
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
        });
    });

    // ── Unhandled events ──────────────────────────────────────────────────────

    describe('Unhandled event types', () => {
        it('returns 200 processed=false for unhandled event types', async () => {
            const payload = {
                id: 'evt_unknown',
                object: 'event',
                type: 'payment_intent.created',
                data: { object: {} },
            };
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(false);
            expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
        });
    });

    // ── Idempotency ───────────────────────────────────────────────────────────

    describe('Idempotency guard', () => {
        it('returns 200 processed=false and skips upsert for duplicate event_id', async () => {
            // Simulate event already seen
            mockStripeEventFindUnique.mockResolvedValue({ id: 'row-1', eventId: 'evt_test_checkout_001' });

            const payload = makeCheckoutSessionPayload();
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(false);
            expect(res.body.reason).toBe('duplicate_event');
            expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
        });

        it('registers the event_id in StripeWebhookEvent after successful processing', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);

            const payload = makeCheckoutSessionPayload();
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(mockStripeEventCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        eventId: 'evt_test_checkout_001',
                        eventType: 'checkout.session.completed',
                    }),
                })
            );
        });
    });

    // ── checkout.session.completed ────────────────────────────────────────────

    describe('checkout.session.completed', () => {
        it('creates/updates subscription when userId is in metadata', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);

            const payload = makeCheckoutSessionPayload();
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: MOCK_USER.id },
                    create: expect.objectContaining({ status: 'ACTIVE', userId: MOCK_USER.id }),
                })
            );
            expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: MOCK_USER.id },
                    data: { provider: 'stripe' },
                })
            );
        });

        it('falls back to email lookup when metadata has no userId', async () => {
            mockUserFindFirst.mockResolvedValue(MOCK_USER);
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);

            // No userId in metadata
            const payload = makeCheckoutSessionPayload({
                metadata: {},
                customer_details: { email: MOCK_USER.email },
            });
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            // findFirst used for email fallback
            expect(mockUserFindFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        email: expect.objectContaining({ equals: MOCK_USER.email }),
                    }),
                })
            );
        });

        it('returns 200 processed=true but skips upsert when no userId and no email match', async () => {
            mockUserFindFirst.mockResolvedValue(null);

            const payload = makeCheckoutSessionPayload({
                metadata: {},
                customer_details: { email: 'ghost@example.com' },
            });
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true); // acknowledged to Stripe
            expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
            // Idempotency record still saved so Stripe doesn't retry forever
            expect(mockStripeEventCreate).toHaveBeenCalled();
        });

        it('returns 200 processed=true but skips upsert when no userId and no customer_details', async () => {
            const payload = makeCheckoutSessionPayload({
                metadata: {},
                customer_details: null,
            });
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
        });
    });

    // ── customer.subscription.updated ────────────────────────────────────────

    describe('customer.subscription.updated', () => {
        it('sets subscription ACTIVE when Stripe status is active', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);

            const payload = makeSubscriptionUpdatedPayload('active');
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ status: 'ACTIVE' }),
                })
            );
        });

        it('sets subscription INACTIVE when Stripe status is canceled', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'INACTIVE' });

            const payload = makeSubscriptionUpdatedPayload('canceled');
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ status: 'INACTIVE' }),
                })
            );
        });

        it('sets subscription PAST_DUE when Stripe status is past_due', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'PAST_DUE' });

            const payload = makeSubscriptionUpdatedPayload('past_due');
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ status: 'PAST_DUE' }),
                })
            );
        });

        it('stores the Stripe subscription id as externalId', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue(MOCK_SUBSCRIPTION);

            const payload = makeSubscriptionUpdatedPayload('active');
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ externalId: 'sub_stripe_001' }),
                })
            );
        });

        it('returns 200 processed=true and registers event without upsert when user not found', async () => {
            mockUserFindUnique.mockResolvedValue(null);

            // No metadata.userId → no fallback customer (customer is a string ID, not resolved)
            const payload = makeSubscriptionUpdatedPayload('active', { metadata: {} });
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
            expect(mockStripeEventCreate).toHaveBeenCalled();
        });
    });

    // ── customer.subscription.deleted ────────────────────────────────────────

    describe('customer.subscription.deleted', () => {
        it('sets subscription INACTIVE on subscription.deleted', async () => {
            mockUserFindUnique.mockResolvedValue(MOCK_USER);
            mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'INACTIVE' });

            const payload = makeSubscriptionDeletedPayload();
            const { bodyStr, stripeSignature } = buildSignedStripeRequest(payload);

            const res = await request(app)
                .post('/admin/webhooks/stripe')
                .set('Content-Type', 'application/octet-stream')
                .set('stripe-signature', stripeSignature)
                .send(Buffer.from(bodyStr));

            expect(res.status).toBe(200);
            expect(res.body.processed).toBe(true);
            expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({ status: 'INACTIVE' }),
                })
            );
            expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { provider: 'stripe' },
                })
            );
        });
    });
});
