import type { Prisma } from '@prisma/client';

export type CompanyRoleUpdatePayload = {
  name?: string;
  description?: string;
  color?: string;
  authorityLevel?: number;
  reportsToId?: string | null;
  canCreateUsers?: boolean;
  canCreateRoles?: string[];
};

export function buildCompanyRoleUpdateData(
  data: CompanyRoleUpdatePayload
): Prisma.CompanyRoleUncheckedUpdateInput {
  const updateData: Prisma.CompanyRoleUncheckedUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.authorityLevel !== undefined) updateData.authority_level = data.authorityLevel;
  if (data.reportsToId !== undefined) updateData.reports_to_id = data.reportsToId;
  if (data.canCreateUsers !== undefined) updateData.can_create_users = data.canCreateUsers;
  if (data.canCreateRoles !== undefined) updateData.can_create_roles = data.canCreateRoles;

  return updateData;
}
