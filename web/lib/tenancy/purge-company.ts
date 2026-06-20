import prisma from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

type DbClient = Pick<PrismaClient, 'company'>;

export type PurgeCompanyResult = {
  purged: boolean;
  alreadyGone: boolean;
};

/**
 * Permanently removes a company and all tenant data via Prisma onDelete cascades.
 * Soft-deleted companies are fully purged on delete (not left as tombstones).
 */
export async function purgeCompanyById(
  companyId: string,
  db: DbClient = prisma
): Promise<PurgeCompanyResult> {
  const existing = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!existing) {
    return { purged: false, alreadyGone: true };
  }

  await db.company.delete({ where: { id: companyId } });
  return { purged: true, alreadyGone: false };
}
