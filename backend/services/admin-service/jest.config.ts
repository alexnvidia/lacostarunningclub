import type { Config } from 'jest';

const config: Config = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@lcrc/shared$': '<rootDir>/../../shared/src/index.ts',
    },
    setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.test.json',
        }],
    },
};

export default config;