import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './database-provider';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = resolveDatabaseUrl();

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

if (process.env.PRISMA_EAGER_CONNECT === '1') {
  prisma.$connect().catch((err) => {
    console.error('Prisma connection error:', err);
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Direct client alias used by transactional onboarding/admin routes. */
export const prismaDirect = prisma;

export default prisma;
