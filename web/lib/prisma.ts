import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL?.trim();
const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ...(databaseUrl
    ? {
        datasources: {
          db: { url: databaseUrl },
        },
      }
    : {}),
} satisfies ConstructorParameters<typeof PrismaClient>[0];

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaOptions);

// Set connection timeout
if (databaseUrl) {
  prisma.$connect().catch((err) => {
    console.error('Prisma connection error:', err);
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Direct client alias used by transactional onboarding/admin routes. */
export const prismaDirect = prisma;

export default prisma;
