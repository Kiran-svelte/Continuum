/**
 * Converts AssistantContext to AssistantExecutionContext for headless services.
 */
import type { AssistantContext } from '@/lib/continuum-assistant/types';
import type { AssistantExecutionContext } from '@/lib/services/types';

/**
 * Maps in-app assistant context to service execution context.
 */
export function assistantContextToExecutionContext(
  ctx: AssistantContext,
  opts?: { idempotencyKey?: string; channel?: 'web' | 'whatsapp' }
): AssistantExecutionContext {
  const nameParts = ctx.displayName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  return {
    employeeId: ctx.employeeId,
    orgId: ctx.companyId,
    email: '',
    firstName,
    lastName,
    primaryRole: ctx.role,
    portalSlug: ctx.portalSlug,
    permissions: ctx.permissions as string[],
    channel: opts?.channel ?? 'web',
    idempotencyKey: opts?.idempotencyKey,
  };
}
