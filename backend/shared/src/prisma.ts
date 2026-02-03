// shared/src/prisma.ts

import { PrismaClient } from './generated/prisma/client'; // OJO: Si usas output custom, importa de ahí
import { PrismaPg } from '@prisma/adapter-pg';
// import { Pool } from 'pg'; // <-- Ya no es estrictamente necesario instanciar Pool manualmente si usas connectionString directa

export * from './generated/prisma/client'; // Re-exportar tipos

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Obtener y limpiar URL
const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}

console.log('🔌 [PRISMA v7] Adapter PG init...');

// 2. Crear Adapter DIRECTAMENTE con opciones (Prisma 7 style)
// Esto usa pg por debajo pero gestiona mejor la config
const adapter = new PrismaPg({
    connectionString: connectionString
});

// 3. Instanciar Cliente
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: ['query', 'error', 'warn']
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
