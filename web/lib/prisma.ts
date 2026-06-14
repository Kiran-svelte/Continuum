import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL?.trim();

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Set connection timeout
prisma.$connect().catch((err) => {
  console.error('Prisma connection error:', err);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Direct client alias used by transactional onboarding/admin routes. */
export const prismaDirect = prisma;

export default prisma;
