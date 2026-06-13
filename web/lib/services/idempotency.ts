/**
 * Idempotency wrapper for headless service write operations.
 * Caches ServiceResult in IdempotencyRecord for 24h.
 * Implements L5-03-007 withIdempotency algorithm.
 */
import prisma from '@/lib/prisma';
import type { ServiceResult, AssistantExecutionContext } from './types';

/** Default TTL for idempotency cache records (in hours). */
const DEFAULT_TTL_HOURS = 24;

/**
 * Executes fn() with idempotency guarantee.
 * If the same key was already executed (and result is not expired),
 * returns the cached result without re-executing fn.
 *
 * @param ctx - Execution context providing orgId and employeeId.
 * @param key - Idempotency key (unique per operation instance).
 * @param fn - The operation to execute (called at most once per key).
 * @param ttlHours - How many hours to cache the result (default 24).
 * @returns Cached or freshly computed ServiceResult.
 */
export async function withIdempotency<T>(
  ctx: Pick<AssistantExecutionContext, 'orgId' | 'employeeId'>,
  key: string,
  fn: () => Promise<ServiceResult<T>>,
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<ServiceResult<T>> {
  const existing = await findExistingRecord(ctx, key);
  if (existing) {
    return existing as ServiceResult<T>;
  }

  const result = await fn();
  await storeResult(ctx, key, result, ttlHours);
  return result;
}

/**
 * Looks up an existing non-expired idempotency record.
 *
 * @param ctx - Context providing orgId and employeeId for lookup.
 * @param key - Idempotency key to look up.
 * @returns Parsed ServiceResult if a valid record exists, or null.
 */
async function findExistingRecord(
  ctx: Pick<AssistantExecutionContext, 'orgId' | 'employeeId'>,
  key: string
): Promise<ServiceResult<unknown> | null> {
  const record = await prisma.idempotencyRecord.findUnique({
    where: {
      company_id_employee_id_idempotency_key: {
        company_id: ctx.orgId,
        employee_id: ctx.employeeId,
        idempotency_key: key,
      },
    },
  });

  if (!record || record.expires_at < new Date()) {
    return null;
  }

  return record.response_json as ServiceResult<unknown>;
}

/**
 * Stores a service result in the idempotency record table.
 * Uses upsert to safely handle any race condition on concurrent first calls.
 *
 * @param ctx - Context providing orgId and employeeId.
 * @param key - Idempotency key under which to store the result.
 * @param result - The ServiceResult to cache.
 * @param ttlHours - TTL in hours from now.
 */
async function storeResult(
  ctx: Pick<AssistantExecutionContext, 'orgId' | 'employeeId'>,
  key: string,
  result: ServiceResult<unknown>,
  ttlHours: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  const httpStatus = result.ok ? 200 : result.error.httpStatus;

  await prisma.idempotencyRecord.upsert({
    where: {
      company_id_employee_id_idempotency_key: {
        company_id: ctx.orgId,
        employee_id: ctx.employeeId,
        idempotency_key: key,
      },
    },
    create: {
      company_id: ctx.orgId,
      employee_id: ctx.employeeId,
      idempotency_key: key,
      response_json: result as object,
      http_status: httpStatus,
      expires_at: expiresAt,
    },
    update: {
      response_json: result as object,
      http_status: httpStatus,
      expires_at: expiresAt,
    },
  });
}
