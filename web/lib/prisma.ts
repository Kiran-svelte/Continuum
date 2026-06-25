import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = process.env.DATABASE_URL?.trim();
const prismaOptions: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === 'development'
      ? (['query', 'error', 'warn'] as Prisma.LogLevel[])
      : (['error'] as Prisma.LogLevel[]),
  ...(databaseUrl
    ? {
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      }
    : {}),
};

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Direct client alias used by transactional onboarding/admin routes. */
export const prismaDirect = prisma;

export default prisma;
