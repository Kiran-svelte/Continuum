/**
 * Builds an AssistantExecutionContext from an authenticated employee session.
 * Used by web API routes to call headless services without re-fetching auth.
 * Implements L5-03-003 buildContextFromSession.
 */
import type { AuthEmployee } from '@/lib/auth-guard';
import type { AssistantExecutionContext } from '@/lib/services/types';
import { getDefaultPortalForRole } from '@/lib/auth-routing';

/**
 * Maps a primary role to a portal slug for use in deep links.
 * Mirrors the DEFAULT_PORTAL_BY_ROLE pattern without the full path.
 *
 * @param role - Primary role string.
 * @returns Portal slug ('employee' | 'manager' | 'hr' | 'admin' | 'super-admin').
 */
function derivePortalSlug(role: string): string {
  const portal = getDefaultPortalForRole(role);
  // Extract first segment: '/employee/dashboard' → 'employee'
  const segment = portal.split('/').filter(Boolean)[0];
  return segment ?? 'employee';
}

/**
 * Builds an execution context from an authenticated web session.
 *
 * @param employee - Authenticated employee (must have org_id).
 * @param opts - Optional channel and message context.
 * @returns AssistantExecutionContext ready for service functions.
 */
export function buildContextFromSession(
  employee: AuthEmployee & { org_id: string },
  opts?: {
    channel?: 'web' | 'whatsapp';
    externalMessageId?: string;
    idempotencyKey?: string;
  }
): AssistantExecutionContext {
  return {
    employeeId: employee.id,
    orgId: employee.org_id,
    email: employee.email,
    firstName: employee.first_name,
    lastName: employee.last_name,
    primaryRole: employee.primary_role,
    portalSlug: derivePortalSlug(employee.primary_role),
    permissions: employee.permissions as string[],
    channel: opts?.channel ?? 'web',
    externalMessageId: opts?.externalMessageId,
    idempotencyKey: opts?.idempotencyKey,
  };
}
