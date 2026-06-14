import prisma from '@/lib/prisma';

const MANAGER_ELIGIBLE_ROLES = ['admin', 'hr', 'director', 'manager', 'team_lead'] as const;

/** Roles that must have a reporting manager assigned at invite/provision time. */
export const ROLES_REQUIRING_REPORTING_MANAGER = new Set([
  'employee',
  'team_lead',
  'manager',
  'director',
  'hr',
]);

export type ReportingManagerValidation =
  | { ok: true; managerId: string | null }
  | { ok: false; error: string };

/**
 * Validates and resolves reporting manager for a new hire.
 * Admin is the only role where manager may be omitted (company root).
 */
export async function validateReportingManager(
  orgId: string,
  role: string,
  managerId: string | null | undefined
): Promise<ReportingManagerValidation> {
  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === 'admin') {
    if (!managerId) {
      return { ok: true, managerId: null };
    }
  } else if (!managerId) {
    return {
      ok: false,
      error: 'Reporting manager is required when inviting or provisioning a user.',
    };
  }

  if (!managerId) {
    return { ok: true, managerId: null };
  }

  const manager = await prisma.employee.findFirst({
    where: {
      id: managerId,
      org_id: orgId,
      deleted_at: null,
      status: { notIn: ['terminated', 'exited'] },
    },
    select: { id: true, primary_role: true },
  });

  if (!manager) {
    return { ok: false, error: 'Selected reporting manager was not found in your company.' };
  }

  if (!MANAGER_ELIGIBLE_ROLES.includes(manager.primary_role as (typeof MANAGER_ELIGIBLE_ROLES)[number])) {
    return {
      ok: false,
      error: 'Reporting manager must be an admin, HR, director, manager, or team lead.',
    };
  }

  return { ok: true, managerId: manager.id };
}

/** Manager/director/team_lead may only invite individual contributors into their team. */
export const MANAGER_INVITE_ROLES = new Set(['employee', 'team_lead']);

export function assertManagerInviteRole(role: string): string | null {
  const normalized = role.trim().toLowerCase();
  if (!MANAGER_INVITE_ROLES.has(normalized)) {
    return 'Managers may only invite employees or team leads.';
  }
  return null;
}
