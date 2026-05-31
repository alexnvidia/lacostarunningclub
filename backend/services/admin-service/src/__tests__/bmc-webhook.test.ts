/**
 * Integration test for BMC Webhook endpoint
 *
 * Mocks Prisma and generates real HMAC signatures to simulate BMC calls.
 * Run: npm test (from admin-service directory)
 */

import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import { bmcWebhookHandler } from '../controllers/bmcWebhookController';
import { prisma } from '@lcrc/shared';

// ─── Helper: build a signed BMC request ───────────────────────────────────────
const SECRET = process.env.BMC_WEBHOOK_SECRET!;

/**
 * Returns the JSON string and HMAC-SHA256 hex signature.
 * The test sends the string body so the server computes the same HMAC.
 */
function buildSignedPayload(payload: object): { bodyStr: string; signature: string } {
    const bodyStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', SECRET).update(bodyStr).digest('hex');
    return { bodyStr, signature };
}

// ─── Minimal express app (only the webhook route) ────────────────────────────
function buildApp() {
    const app = express();
    // Must use express.raw so the raw bytes reach the controller for HMAC check
    app.post('/admin/webhooks/bmc', express.raw({ type: '*/*' }), bmcWebhookHandler);
    return app;
}

// ─── Mock Prisma references ───────────────────────────────────────────────────
const mockUserFindFirst = prisma.user.findFirst as jest.Mock;
const mockSubscriptionUpsert = prisma.subscription.upsert as jest.Mock;
const mockBmcEventFindUnique = (prisma as any).bmcWebhookEvent.findUnique as jest.Mock;
const mockBmcEventCreate = (prisma as any).bmcWebhookEvent.create as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const MOCK_USER = {
    id: 'user-uuid-123',
    email: 'member@example.com',
    bmcEmail: null,
};

const MOCK_SUBSCRIPTION = {
    id: 'sub-uuid-456',
    userId: MOCK_USER.id,
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
    endDate: null,
    lastPaymentDate: null,
    provider: 'buymeacoffee',
    externalId: 'bmc-membership-001',
    createdAt: new Date(),
    updatedAt: new Date(),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /webhooks/bmc', () => {
    let app: express.Express;

    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
        // Por defecto: evento no visto antes
        mockBmcEventFindUnique.mockResolvedValue(null);
        mockBmcEventCreate.mockResolvedValue({});
    });

    // ── Success cases ────────────────────────────────────────────────────────

    it('activates subscription on membership_started', async () => {
        mockUserFindFirst.mockResolvedValue(MOCK_USER);
        mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'ACTIVE' });

        const payload = {
            type: 'membership.started',
            event_id: 'evt-001',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                started_at: '2026-01-01T00:00:00Z',
            },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(true);
        expect(res.body.status).toBe('ACTIVE');
        expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ status: 'ACTIVE', userId: MOCK_USER.id }),
            })
        );
    });

    it('deactivates subscription on membership_cancelled', async () => {
        mockUserFindFirst.mockResolvedValue(MOCK_USER);
        mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'INACTIVE' });

        const payload = {
            type: 'membership.cancelled',
            event_id: 'evt-002',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                cancelled_at: '2026-02-01T00:00:00Z',
            },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(true);
        expect(res.body.status).toBe('INACTIVE');
        expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({ status: 'INACTIVE' }),
            })
        );
    });

    it('updates subscription on membership_updated', async () => {
        mockUserFindFirst.mockResolvedValue(MOCK_USER);
        mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'ACTIVE' });

        const payload = {
            type: 'membership.updated',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                next_billing_date: '2026-03-01T00:00:00Z',
                last_payment_date: '2026-02-01T00:00:00Z',
            },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(true);
        expect(res.body.status).toBe('ACTIVE');
    });

    it('returns 200 processed=false when user is not registered', async () => {
        mockUserFindFirst.mockResolvedValue(null);

        const payload = {
            type: 'membership.started',
            data: { payer_email: 'unknown@example.com' },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(false);
        expect(res.body.reason).toBe('user_not_found');
        expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
    });

    it('returns 200 processed=false for unhandled event types', async () => {
        const payload = { type: 'coffee_bought', data: {} };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(false);
        expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
    });

    // ── Security cases ────────────────────────────────────────────────────────

    it('returns 401 when X-BMC-Signature header is missing', async () => {
        const payload = { type: 'membership.started', data: { payer_email: 'a@b.com' } };
        const bodyStr = JSON.stringify(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .send(bodyStr);

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Missing/i);
    });

    it('returns 401 when signature is tampered', async () => {
        const payload = { type: 'membership.started', data: { payer_email: 'a@b.com' } };
        const bodyStr = JSON.stringify(payload);
        // Produce a valid-length but wrong HMAC using a different secret
        const tampered = crypto.createHmac('sha256', 'wrong-secret').update(bodyStr).digest('hex');

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', tampered)
            .send(bodyStr);

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Invalid signature/i);
    });

    it('returns 422 when payer_email is missing in payload', async () => {
        const payload = { type: 'membership.started', data: { membership_id: 'bmc-001' } };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(422);
        expect(res.body.error).toMatch(/payer_email/i);
    });
    // ── Idempotency cases ─────────────────────────────────────────────────────

    it('returns 200 processed=false and skips upsert when event_id is duplicate', async () => {
        mockBmcEventFindUnique.mockResolvedValue({ id: 'existing-row', eventId: 'evt-dup' });

        const payload = {
            type: 'membership.started',
            event_id: 'evt-dup',
            data: { payer_email: 'member@example.com' },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(false);
        expect(res.body.reason).toBe('duplicate_event');
        expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
    });

    it('records event_id in BmcWebhookEvent after successful processing', async () => {
        mockUserFindFirst.mockResolvedValue(MOCK_USER);
        mockSubscriptionUpsert.mockResolvedValue({ ...MOCK_SUBSCRIPTION, status: 'ACTIVE' });

        const payload = {
            type: 'membership.started',
            event_id: 'evt-new-123',
            data: {
                membership_id: 'bmc-membership-001',
                payer_email: 'member@example.com',
                started_at: 1676552204,
            },
        };
        const { bodyStr, signature } = buildSignedPayload(payload);

        const res = await request(app)
            .post('/admin/webhooks/bmc')
            .set('Content-Type', 'application/json')
            .set('x-signature-sha256', signature)
            .send(bodyStr);

        expect(res.status).toBe(200);
        expect(res.body.processed).toBe(true);
        expect(mockBmcEventCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    eventId: 'evt-new-123',
                    eventType: 'membership.started',
                }),
            })
        );
    });
});
