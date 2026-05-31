// Test environment setup — mock heavy dependencies before any import
import { jest } from '@jest/globals';

process.env.BMC_WEBHOOK_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Mock @lcrc/shared so Prisma is never instantiated in tests
jest.mock('@lcrc/shared', () => ({
    prisma: {
        user: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        subscription: {
            upsert: jest.fn(),
        },
        bmcWebhookEvent: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

