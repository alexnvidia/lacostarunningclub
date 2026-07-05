// Test environment setup — mock heavy dependencies before any import
import { jest } from '@jest/globals';

process.env.BMC_WEBHOOK_SECRET = 'test-bmc-secret';
process.env.STRIPE_SECRET_KEY  = 'sk_test_dummy_key_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy_secret';
process.env.NODE_ENV = 'test';

// Mock @lcrc/shared so Prisma is never instantiated in tests
jest.mock('@lcrc/shared', () => ({
    prisma: {
        user: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        subscription: {
            upsert: jest.fn(),
            update: jest.fn(),
        },
        bmcWebhookEvent: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        stripeWebhookEvent: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));
