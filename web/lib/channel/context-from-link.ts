/**
 * Builds an AssistantExecutionContext from a ChannelIdentityLink (WhatsApp path).
 * Validates that the link is active, employee is active, and org matches.
 * Implements L5-03-003 buildContextFromLink.
 */
import prisma from '@/lib/prisma';
import type { AssistantExecutionContext } from '@/lib/services/types';
import { getUserPermissions } from '@/lib/rbac';
import { getDefaultPortalForRole } from '@/lib/auth-routing';

/** Minimal link object required for context building. */
interface ChannelLinkForContext {
  id: string;
  company_id: string;
  employee_id: string;
  channel: string;
  revoked_at: Date | null;
}

/**
 * Derives portal slug from role string.
 *
 * @param role - Primary role string.
 * @returns First path segment of the default portal path.
 */
function derivePortalSlug(role: string): string {
  const portal = getDefaultPortalForRole(role);
  const segment = portal.split('/').filter(Boolean)[0];
  return segment ?? 'employee';
}

/**
 * Builds an execution context from a ChannelIdentityLink (WhatsApp inbound).
 *
 * @param link - Active ChannelIdentityLink row.
 * @param opts - Optional external message id and idempotency key.
 * @returns AssistantExecutionContext ready for service functions.
 * @throws Error if link is revoked, employee inactive, or org mismatch.
 */
export async function buildContextFromLink(
  link: ChannelLinkForContext,
  opts?: { externalMessageId?: string; idempotencyKey?: string }
): Promise<AssistantExecutionContext> {
  if (link.revoked_at !== null) {
    throw new Error('Channel link is revoked');
  }

  const employee = await prisma.employee.findUnique({
    where: { id: link.employee_id },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      org_id: true,
      primary_role: true,
      status: true,
    },
  });

  if (!employee || employee.status !== 'active') {
    throw new Error('Employee not found or inactive');
  }

  if (employee.org_id !== link.company_id) {
    throw new Error('Tenant isolation violation: org mismatch');
  }

  const permissions = await getUserPermissions(employee.id, employee.org_id!);

  return {
    employeeId: employee.id,
    orgId: employee.org_id!,
    email: employee.email,
    firstName: employee.first_name,
    lastName: employee.last_name,
    primaryRole: employee.primary_role,
    portalSlug: derivePortalSlug(employee.primary_role),
    permissions: permissions as string[],
    channel: link.channel === 'whatsapp' ? 'whatsapp' : 'web',
    externalMessageId: opts?.externalMessageId,
    idempotencyKey: opts?.idempotencyKey,
  };
}
