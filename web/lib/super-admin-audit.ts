import { createAuditLog, type CreateAuditLogParams } from '@/lib/audit';
import type { AuthUser } from '@/lib/auth-service';

type SuperAdminActor = Pick<AuthUser, 'id' | 'email' | 'role'>;

type SuperAdminAuditParams = Omit<CreateAuditLogParams, 'actorId' | 'newState'> & {
  actor: SuperAdminActor;
  newState?: Record<string, unknown> | null;
};

export type SuperAdminAuditResult =
  | { logged: true; id: string }
  | { logged: false; error: string };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * PRODERR-20260702: SuperAdmin is not an Employee, so AuditLog.actor_id cannot
 * point at SuperAdmin.id. Store the platform actor in the JSON state instead.
 */
export async function createSuperAdminAuditLog(
  params: SuperAdminAuditParams
): Promise<SuperAdminAuditResult> {
  const { actor, newState, ...auditParams } = params;

  try {
    const auditId = await createAuditLog({
      ...auditParams,
      actorId: null,
      newState: {
        ...(newState ?? {}),
        platform_actor_id: actor.id,
        platform_actor_email: actor.email,
        platform_actor_role: actor.role,
      },
    });

    return { logged: true, id: auditId };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('[SUPER ADMIN AUDIT] Failed to write audit log', {
      action: auditParams.action,
      companyId: auditParams.companyId,
      entityType: auditParams.entityType,
      entityId: auditParams.entityId,
      error: message,
    });
    return { logged: false, error: message };
  }
}
