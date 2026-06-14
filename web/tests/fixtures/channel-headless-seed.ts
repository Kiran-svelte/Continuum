/**
 * Test fixtures for headless channel executor tests.
 */
import type { AssistantExecutionContext } from '@/lib/services/types';
import { getUserPermissions } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * Builds execution context for a seeded employee (integration tests).
 */
export async function buildContextForEmployee(
  employeeId: string,
  opts?: { channel?: 'web' | 'whatsapp'; idempotencyKey?: string }
): Promise<AssistantExecutionContext> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      org_id: true,
      email: true,
      first_name: true,
      last_name: true,
      primary_role: true,
    },
  });

  if (!employee?.org_id) {
    throw new Error(`Fixture employee not found: ${employeeId}`);
  }

  const permissions = await getUserPermissions(employee.id, employee.org_id);

  return {
    employeeId: employee.id,
    orgId: employee.org_id,
    email: employee.email,
    firstName: employee.first_name,
    lastName: employee.last_name,
    primaryRole: employee.primary_role,
    portalSlug: employee.primary_role === 'manager' ? 'manager' : 'employee',
    permissions: permissions as string[],
    channel: opts?.channel ?? 'web',
    idempotencyKey: opts?.idempotencyKey,
  };
}
