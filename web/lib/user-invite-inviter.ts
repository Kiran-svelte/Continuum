import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

type UserInviteCreateData =
  | { invited_by_super_id: string; invited_by_id?: never }
  | { invited_by_id: string; invited_by_super_id?: never };

export interface InviteActor {
  id: string;
  email: string;
  role: Role;
}

interface SuperAdminLookupDelegate {
  findUnique(args: {
    where: { id: string } | { email: string };
    select: { id: true };
  }): Promise<{ id: string } | null>;
}

interface EmployeeLookupDelegate {
  findUnique(args: {
    where: { id: string } | { email: string };
    select: { id: true; primary_role?: true };
  }): Promise<{ id: string; primary_role?: Role } | null>;
}

interface InviteInviterPrismaLike {
  superAdmin: SuperAdminLookupDelegate;
  employee: EmployeeLookupDelegate;
}

interface ResolveUserInviteInviterOptions {
  prismaClient?: InviteInviterPrismaLike;
}

interface ResolveAcceptedInviteInvitedByTypeOptions {
  prismaClient?: InviteInviterPrismaLike;
  invitedByEmployeeRole?: Role | null;
}

export interface ResolvedUserInviteInviter {
  inviterType: 'super_admin' | 'employee';
  userInviteCreateData: UserInviteCreateData;
}

interface AcceptedInviteLookup {
  invited_by_super_id: string | null;
  invited_by_id: string | null;
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function requireEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Authenticated actor email is required to resolve invite inviter identity.');
  }
  return normalizedEmail;
}

export async function resolveUserInviteInviter(
  actor: InviteActor,
  options: ResolveUserInviteInviterOptions = {}
): Promise<ResolvedUserInviteInviter> {
  const prismaClient = options.prismaClient ?? (prisma as unknown as InviteInviterPrismaLike);
  const normalizedEmail = requireEmail(actor.email);

  if (actor.role === 'super_admin') {
    const superAdminById = await prismaClient.superAdmin.findUnique({
      where: { id: actor.id },
      select: { id: true },
    });

    if (superAdminById) {
      return {
        inviterType: 'super_admin',
        userInviteCreateData: { invited_by_super_id: superAdminById.id },
      };
    }

    const superAdminByEmail = await prismaClient.superAdmin.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (superAdminByEmail) {
      return {
        inviterType: 'super_admin',
        userInviteCreateData: { invited_by_super_id: superAdminByEmail.id },
      };
    }
  }

  const employeeById = await prismaClient.employee.findUnique({
    where: { id: actor.id },
    select: { id: true },
  });

  if (employeeById) {
    return {
      inviterType: 'employee',
      userInviteCreateData: { invited_by_id: employeeById.id },
    };
  }

  const employeeByEmail = await prismaClient.employee.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (employeeByEmail) {
    return {
      inviterType: 'employee',
      userInviteCreateData: { invited_by_id: employeeByEmail.id },
    };
  }

  throw new Error(
    `Unable to resolve inviter identity for ${normalizedEmail}. No matching SuperAdmin or Employee record exists for invite ownership.`
  );
}

export async function resolveAcceptedInviteInvitedByType(
  invite: AcceptedInviteLookup,
  options: ResolveAcceptedInviteInvitedByTypeOptions = {}
): Promise<'super_admin' | 'employee'> {
  const prismaClient = options.prismaClient ?? (prisma as unknown as InviteInviterPrismaLike);

  if (invite.invited_by_super_id) {
    return 'super_admin';
  }

  if (!invite.invited_by_id) {
    return 'employee';
  }

  const resolvedRole =
    options.invitedByEmployeeRole ??
    (
      await prismaClient.employee.findUnique({
        where: { id: invite.invited_by_id },
        select: { id: true, primary_role: true },
      })
    )?.primary_role;

  return resolvedRole === 'super_admin' ? 'super_admin' : 'employee';
}

export async function resolveEmployeeInvitedBy(
  user: InviteActor,
  options: ResolveUserInviteInviterOptions = {}
): Promise<{ invited_by_id: string | null; invited_by_type: 'super_admin' | 'admin' | 'hr' | 'employee' }> {
  const prismaClient = options.prismaClient ?? (prisma as unknown as InviteInviterPrismaLike);
  const normalizedEmail = requireEmail(user.email);

  if (user.role === 'super_admin') {
    const superAdminById = await prismaClient.superAdmin.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (superAdminById) {
      return { invited_by_id: null, invited_by_type: 'super_admin' };
    }

    const employeeById = await prismaClient.employee.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (employeeById) {
      return { invited_by_id: employeeById.id, invited_by_type: 'super_admin' };
    }

    const employeeByEmail = await prismaClient.employee.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (employeeByEmail) {
      return { invited_by_id: employeeByEmail.id, invited_by_type: 'super_admin' };
    }

    return { invited_by_id: null, invited_by_type: 'super_admin' };
  }

  if (user.role === 'hr') {
    return { invited_by_id: user.id, invited_by_type: 'hr' };
  }

  return { invited_by_id: user.id, invited_by_type: user.role === 'admin' ? 'admin' : 'employee' };
}
