import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import type { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { sendInviteEmail } from '@/lib/email-service';
import { buildInviteAcceptUrl } from '@/lib/invite-url';
import { promiseTimeout } from '@/lib/promise-timeout';
import { validateReportingManager } from '@/lib/invite-reporting-manager';
import { findEmployeeBlockingEmail } from '@/lib/employee-email-lifecycle';

export const dynamic = 'force-dynamic';

const INVITE_EMAIL_TIMEOUT_MS = 12_000;

const HR_ADMIN_INVITE_ROLES = new Set(['admin', 'hr', 'super_admin']);
const MANAGER_INVITE_ROLES = new Set(['manager', 'director', 'team_lead']);

function canManageCompanyInvite(
  user: { id: string; role: Role },
  invite: { manager_id: string | null; invited_by_id?: string | null }
): boolean {
  if (HR_ADMIN_INVITE_ROLES.has(user.role)) {
    return true;
  }
  if (!MANAGER_INVITE_ROLES.has(user.role)) {
    return false;
  }
  return invite.manager_id === user.id || invite.invited_by_id === user.id;
}

const updateInviteSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'hr', 'director', 'manager', 'team_lead', 'employee']).optional(),
  department: z.string().max(120).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.orgId) {
      return NextResponse.json(
        { error: 'You must belong to a company to edit invites' },
        { status: 400 }
      );
    }

    if (!['admin', 'hr', 'super_admin', 'manager', 'director', 'team_lead'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit invites' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const invite = await prisma.userInvite.findFirst({
      where: {
        id,
        company_id: user.orgId,
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        manager_id: true,
        invited_by_id: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (!canManageCompanyInvite(user, invite)) {
      return NextResponse.json({ error: 'You do not have permission to edit this invite' }, { status: 403 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be edited' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, role, department, managerId } = parsed.data;
    if (!email && !firstName && !lastName && !role && department === undefined && managerId === undefined) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const blockingEmployee = await findEmployeeBlockingEmail(prisma, normalizedEmail);
      if (blockingEmployee) {
        return NextResponse.json(
          { error: 'An existing user already uses this email' },
          { status: 409 }
        );
      }

      const existingPendingInvite = await prisma.userInvite.findFirst({
        where: {
          id: { not: invite.id },
          email: normalizedEmail,
          status: 'pending',
          company_id: user.orgId,
        },
        select: { id: true },
      });
      if (existingPendingInvite) {
        return NextResponse.json(
          { error: 'A pending invite already exists for this email' },
          { status: 409 }
        );
      }

      updateData.email = normalizedEmail;
    }

    if (firstName) updateData.first_name = firstName.trim();
    if (lastName) updateData.last_name = lastName.trim();
    if (role) updateData.role = role as Role;
    if (department !== undefined) updateData.department = department?.trim() || null;

    const effectiveRole = (role ?? invite.role) as Role;
    const effectiveManagerId =
      managerId !== undefined ? managerId : (invite.manager_id as string | null);

    const managerValidation = await validateReportingManager(
      user.orgId,
      effectiveRole,
      effectiveManagerId
    );
    if (!managerValidation.ok) {
      return NextResponse.json({ error: managerValidation.error }, { status: 400 });
    }
    if (managerId !== undefined || role) {
      updateData.manager_id = managerValidation.managerId;
    }

    const updatedInvite = await prisma.userInvite.update({
      where: { id: invite.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        expires_at: true,
        updated_at: true,
        department: true,
      },
    });

    return NextResponse.json({ success: true, invite: updatedInvite });
  } catch (error) {
    console.error('[COMPANY INVITE PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update invite', details: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'super_admin', 'manager', 'director', 'team_lead'].includes(user.role)) {
      return NextResponse.json({ error: 'You do not have permission to resend invites' }, { status: 403 });
    }

    const { id } = await params;
    const invite = await prisma.userInvite.findFirst({
      where: { id, company_id: user.orgId },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        department: true,
        manager_id: true,
        invited_by_id: true,
      },
    });
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (!canManageCompanyInvite(user, invite)) {
      return NextResponse.json({ error: 'You do not have permission to resend this invite' }, { status: 403 });
    }
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Only pending invites can be resent' }, { status: 400 });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await prisma.userInvite.update({
      where: { id: invite.id },
      data: { token, expires_at: expiresAt, updated_at: new Date() },
      select: { id: true, email: true, role: true, expires_at: true, department: true },
    });
    const company = await prisma.company.findUnique({ where: { id: user.orgId }, select: { name: true } });
    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    let inviteEmailSent = false;
    let inviteEmailError: string | undefined;
    try {
      const emailResult = await promiseTimeout(
        sendInviteEmail(
          updated.email,
          company?.name || 'your company',
          inviterName,
          token,
          updated.role,
          updated.department || undefined
        ),
        INVITE_EMAIL_TIMEOUT_MS,
        'Invitation email delivery timed out'
      );
      inviteEmailSent = emailResult.success;
      inviteEmailError = emailResult.error;
    } catch (emailError) {
      inviteEmailError =
        emailError instanceof Error
          ? emailError.message
          : 'Invitation email delivery timed out';
    }

    return NextResponse.json({
      success: true,
      invite: updated,
      inviteUrl: buildInviteAcceptUrl(token, { request }),
      email: {
        attempted: true,
        sent: inviteEmailSent,
        error: inviteEmailError,
      },
      message: inviteEmailSent ? 'Invitation email sent.' : 'Invite refreshed but email delivery failed.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to resend invite', details: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'super_admin', 'manager', 'director', 'team_lead'].includes(user.role)) {
      return NextResponse.json({ error: 'You do not have permission to revoke invites' }, { status: 403 });
    }
    const { id } = await params;
    const invite = await prisma.userInvite.findFirst({
      where: { id, company_id: user.orgId },
      select: { id: true, status: true, manager_id: true, invited_by_id: true },
    });
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (!canManageCompanyInvite(user, invite)) {
      return NextResponse.json({ error: 'You do not have permission to revoke this invite' }, { status: 403 });
    }
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Only pending invites can be revoked' }, { status: 400 });
    await prisma.userInvite.update({
      where: { id: invite.id },
      data: { status: 'revoked', updated_at: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to revoke invite', details: message }, { status: 500 });
  }
}
