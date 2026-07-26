import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email-normalization';
import { hashPassword, generateTemporaryPassword } from '@/lib/password-service';
import { resolveAcceptedInviteInvitedByType } from '@/lib/user-invite-inviter';
import { markEmailVerified } from '@/lib/product-readiness';
import type { Role } from '@prisma/client';

export function normalizeInviteToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

type InviteRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  company_id: string | null;
  invited_by_id: string | null;
  invited_by_super_id: string | null;
  manager_id?: string | null;
  department?: string | null;
  Employee?: { primary_role: Role } | null;
};

/**
 * Creates or refreshes an employee account for a pending invite with a new temporary password.
 * Returns the plaintext password once (for email delivery only).
 */
export async function provisionTemporaryInviteAccess(
  invite: InviteRecord,
  options: { temporaryPassword?: string } = {}
): Promise<{ temporaryPassword: string; employeeId: string }> {
  const temporaryPassword = options.temporaryPassword || generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const normalizedEmail = normalizeEmail(invite.email);

  const invitedByType = await resolveAcceptedInviteInvitedByType(
    {
      invited_by_id: invite.invited_by_id,
      invited_by_super_id: invite.invited_by_super_id,
    },
    {
      invitedByEmployeeRole: invite.Employee?.primary_role,
    }
  );

  const existing = await prisma.employee.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    await prisma.employee.update({
      where: { id: existing.id },
      data: {
        first_name: invite.first_name || undefined,
        last_name: invite.last_name || undefined,
        primary_role: invite.role,
        password_hash: passwordHash,
        must_change_password: true,
        org_id: invite.company_id ?? undefined,
        manager_id: invite.manager_id ?? undefined,
        department: invite.department ?? undefined,
        status: invite.company_id ? 'active' : 'onboarding',
        updated_at: new Date(),
      },
    });
    // Accepting an invite proves control of the invited mailbox, so the
    // account is already verified — otherwise the temporary password we just
    // issued would be rejected by the email-verification gate.
    await markEmailVerified(existing.id, invite.company_id);
    return { temporaryPassword, employeeId: existing.id };
  }

  const created = await prisma.employee.create({
    data: {
      id: randomUUID(),
      email: normalizedEmail,
      first_name: invite.first_name || '',
      last_name: invite.last_name || '',
      primary_role: invite.role,
      password_hash: passwordHash,
      invited_by_id: invite.invited_by_id,
      invited_by_type: invitedByType,
      org_id: invite.company_id,
      manager_id: invite.manager_id ?? null,
      department: invite.department ?? null,
      must_change_password: true,
      status: invite.company_id ? 'active' : 'onboarding',
      updated_at: new Date(),
    },
    select: { id: true },
  });

  await markEmailVerified(created.id, invite.company_id);

  return { temporaryPassword, employeeId: created.id };
}
