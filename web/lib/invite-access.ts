import { resolveInviteTargets, type CompanyRolePolicyInput } from '@/lib/company-hierarchy-policy';

/** Company-scoped invite (not super-admin platform user invites). */
export function canUseCompanyInviteFlow(actorRole: string | null | undefined): boolean {
  const role = (actorRole || '').trim().toLowerCase();
  return role !== '' && role !== 'super_admin';
}

export function canInviteCompanyUsers(input: {
  actorRole: string;
  enabledRoles: unknown;
  companyRole?: CompanyRolePolicyInput | null;
}): boolean {
  if (!canUseCompanyInviteFlow(input.actorRole)) {
    return false;
  }

  const policy = resolveInviteTargets(input.actorRole, input.enabledRoles, input.companyRole);
  return policy.allowedRoles.length > 0;
}
