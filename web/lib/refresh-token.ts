import { createHash } from 'crypto';
import type { Employee, Prisma, PrismaClient, RefreshToken } from '@prisma/client';

export type RefreshTokenPrismaClient = PrismaClient | Prisma.TransactionClient;

export type RefreshTokenWithEmployee = RefreshToken & { employee: Employee };

/**
 * Hashes refresh tokens for at-rest storage.
 *
 * We store only the SHA-256 hex digest (never the raw token).
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isSha256HexDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

type CreateRefreshTokenRecordParams = {
  tokenId: string;
  refreshToken: string;
  employeeId: string;
  expiresAt: Date;
  deviceInfo?: string | null;
  ipAddress?: string | null;
};

/**
 * Creates a refresh token row with hashed-at-rest token storage.
 * This is the only supported write path for new refresh token records.
 */
export async function createRefreshTokenRecord(
  prisma: RefreshTokenPrismaClient,
  params: CreateRefreshTokenRecordParams
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      id: params.tokenId,
      token_hash: hashRefreshToken(params.refreshToken),
      employee_id: params.employeeId,
      expires_at: params.expiresAt,
      device_info: params.deviceInfo ?? undefined,
      ip_address: params.ipAddress ?? undefined,
    },
  });
}

/**
 * Looks up a valid refresh token record for rotation.
 *
 * Backward compatibility:
 * - If a legacy row stored the raw token string in `token_hash`, it is accepted
 *   once and then migrated to hashed-at-rest storage.
 */
export async function findValidRefreshTokenWithEmployee(
  prisma: RefreshTokenPrismaClient,
  params: {
    tokenId: string;
    refreshToken: string;
    now?: Date;
  }
): Promise<RefreshTokenWithEmployee | null> {
  const now = params.now ?? new Date();
  const refreshTokenHash = hashRefreshToken(params.refreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      id: params.tokenId,
      OR: [{ token_hash: refreshTokenHash }, { token_hash: params.refreshToken }],
      revoked_at: null,
      expires_at: { gt: now },
    },
    include: { employee: true },
  });

  if (!storedToken) {
    return null;
  }

  if (storedToken.token_hash === params.refreshToken) {
    try {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { token_hash: refreshTokenHash },
      });
    } catch (error) {
      // Fail closed, but attempt to remove the raw token value from storage.
      try {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      } catch {
        // Ignore cleanup failures.
      }

      console.error('[REFRESH TOKEN] Failed to migrate legacy refresh token to hashed storage:', error);
      return null;
    }
  }

  // employee_id is nullable in the schema (super admins don't have one).
  // RefreshTokenWithEmployee requires a non-null employee, so guard here.
  if (!storedToken.employee) {
    return null;
  }

  return storedToken as RefreshTokenWithEmployee;
}

/**
 * Deletes refresh token rows for a presented token value.
 *
 * Backward compatibility: deletes either hashed-at-rest or legacy raw-at-rest.
 */
export async function deleteRefreshTokenByPresentedToken(
  prisma: RefreshTokenPrismaClient,
  refreshToken: string
): Promise<Prisma.BatchPayload> {
  const refreshTokenHash = hashRefreshToken(refreshToken);

  return prisma.refreshToken.deleteMany({
    where: {
      OR: [{ token_hash: refreshTokenHash }, { token_hash: refreshToken }],
    },
  });
}

export async function deleteRefreshTokensForEmployee(
  prisma: RefreshTokenPrismaClient,
  employeeId: string
): Promise<Prisma.BatchPayload> {
  return prisma.refreshToken.deleteMany({
    where: { employee_id: employeeId },
  });
}

/**
 * Revokes a single refresh token by id. If the presented token string is
 * available, we also normalize `token_hash` to the hashed-at-rest format.
 */
export async function revokeRefreshTokenById(
  prisma: RefreshTokenPrismaClient,
  params: {
    tokenId: string;
    revokedAt?: Date;
    refreshToken?: string;
  }
): Promise<void> {
  const revokedAt = params.revokedAt ?? new Date();
  const tokenHashUpdate = params.refreshToken
    ? { token_hash: hashRefreshToken(params.refreshToken) }
    : {};

  await prisma.refreshToken.update({
    where: { id: params.tokenId },
    data: {
      revoked_at: revokedAt,
      ...tokenHashUpdate,
    },
  });
}

/**
 * Best-effort normalization for legacy rows where `token_hash` contains a raw
 * token string. Any record that can't be migrated is deleted to avoid keeping
 * raw tokens at rest.
 */
export async function normalizeLegacyRefreshTokensForEmployee(
  prisma: RefreshTokenPrismaClient,
  employeeId: string
): Promise<void> {
  const tokens = await prisma.refreshToken.findMany({
    where: { employee_id: employeeId },
    select: { id: true, token_hash: true },
  });

  for (const token of tokens) {
    if (!token.token_hash || isSha256HexDigest(token.token_hash)) {
      continue;
    }

    try {
      await prisma.refreshToken.update({
        where: { id: token.id },
        data: { token_hash: hashRefreshToken(token.token_hash) },
      });
    } catch {
      // If migration fails, delete the record to avoid retaining raw tokens.
      try {
        await prisma.refreshToken.delete({ where: { id: token.id } });
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

export async function revokeAllRefreshTokensForEmployee(
  prisma: RefreshTokenPrismaClient,
  employeeId: string,
  revokedAt: Date = new Date()
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { employee_id: employeeId, revoked_at: null },
    data: { revoked_at: revokedAt },
  });
}
