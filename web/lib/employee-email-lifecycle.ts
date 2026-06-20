import type { PrismaClient } from '@prisma/client';
import { normalizeEmail } from '@/lib/email-normalization';

/** Reserved domain for tombstoned employee emails (global unique constraint). */
export const RELEASED_EMAIL_DOMAIN = 'released.continuum.invalid';

export function buildReleasedEmail(employeeId: string): string {
  const slug = employeeId.replace(/-/g, '').slice(0, 32);
  return `released+${slug}@${RELEASED_EMAIL_DOMAIN}`;
}

export function isReleasedEmail(email: string): boolean {
  return email.endsWith(`@${RELEASED_EMAIL_DOMAIN}`);
}

type EmployeeEmailHolder = {
  id: string;
  deleted_at: Date | null;
  status: string;
  email: string;
};

/** True when the row still occupies the global email unique slot. */
export function employeeHoldsEmail(employee: EmployeeEmailHolder): boolean {
  if (isReleasedEmail(employee.email)) return false;
  if (employee.deleted_at != null) return false;
  if (employee.status === 'terminated' || employee.status === 'exited') return false;
  return true;
}

type PrismaLike = Pick<PrismaClient, 'employee'>;

export async function findEmployeeBlockingEmail(
  db: PrismaLike,
  rawEmail: string,
  options?: { excludeEmployeeId?: string }
): Promise<EmployeeEmailHolder | null> {
  const email = normalizeEmail(rawEmail);
  if (!email) return null;

  const employee = await db.employee.findUnique({
    where: { email },
    select: { id: true, deleted_at: true, status: true, email: true },
  });

  if (!employee) return null;
  if (options?.excludeEmployeeId && employee.id === options.excludeEmployeeId) return null;
  if (!employeeHoldsEmail(employee)) return null;
  return employee;
}

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Soft-deactivates an employee and releases their email for re-invite.
 * Revokes refresh tokens and deletes active sessions.
 */
export async function deactivateEmployeeAndReleaseEmail(
  tx: TransactionClient,
  params: {
    employeeId: string;
    status?: 'terminated' | 'exited';
  }
): Promise<void> {
  const releasedEmail = buildReleasedEmail(params.employeeId);
  const now = new Date();

  await tx.refreshToken.updateMany({
    where: { employee_id: params.employeeId, revoked_at: null },
    data: { revoked_at: now },
  });

  await tx.session.deleteMany({
    where: { employee_id: params.employeeId },
  });

  await tx.employee.update({
    where: { id: params.employeeId },
    data: {
      status: params.status ?? 'terminated',
      deleted_at: now,
      email: releasedEmail,
      updated_at: now,
    },
  });
}
