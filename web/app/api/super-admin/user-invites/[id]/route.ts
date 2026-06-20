import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import type { Role } from '@prisma/client';
import { provisionTemporaryInviteAccess } from '@/lib/invite-provisioning';
import { sendHybridInviteEmail } from '@/lib/email-service';
import { buildInviteAcceptUrl } from '@/lib/invite-url';
import { promiseTimeout } from '@/lib/promise-timeout';
import { findEmployeeBlockingEmail } from '@/lib/employee-email-lifecycle';

export const dynamic = 'force-dynamic';

const INVITE_EMAIL_TIMEOUT_MS = 12_000;

const updateInviteSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'hr', 'director', 'manager']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = updateInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invite = await prisma.userInvite.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invites can be edited' },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, role } = parsed.data;
    if (!email && !firstName && !lastName && !role) {
      return NextResponse.json(
        { error: 'At least one editable field is required' },
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

    if (firstName) {
      updateData.first_name = firstName.trim();
    }

    if (lastName) {
      updateData.last_name = lastName.trim();
    }

    if (role) {
      updateData.role = role as Role;
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
      },
    });

    return NextResponse.json({ success: true, invite: updatedInvite });
  } catch (error) {
    console.error('[SUPER ADMIN INVITE PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update invite', details: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invite = await prisma.userInvite.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } },
        invited_by_employee: { select: { primary_role: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be resent' }, { status: 400 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updatedInvite = await prisma.userInvite.update({
      where: { id: invite.id },
      data: { token, expires_at: expiresAt, updated_at: new Date() },
    });

    const { temporaryPassword } = await provisionTemporaryInviteAccess({
      id: invite.id,
      email: invite.email,
      first_name: invite.first_name,
      last_name: invite.last_name,
      role: invite.role,
      company_id: invite.company_id,
      invited_by_id: invite.invited_by_id,
      invited_by_super_id: invite.invited_by_super_id,
      manager_id: invite.manager_id,
      department: invite.department,
      Employee: invite.invited_by_employee,
    });

    const inviteUrl = buildInviteAcceptUrl(updatedInvite.token, { request });
    const inviterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;

    let inviteEmailSent = false;
    let inviteEmailError: string | undefined;
    try {
      const emailResult = await promiseTimeout(
        sendHybridInviteEmail(
          invite.email,
          invite.first_name,
          invite.company?.name || 'Continuum',
          inviterName,
          inviteUrl,
          invite.role,
          temporaryPassword,
          invite.department || undefined
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
      invite: updatedInvite,
      inviteUrl,
      email: {
        attempted: true,
        sent: inviteEmailSent,
        error: inviteEmailError,
      },
      message: inviteEmailSent
        ? 'Invitation email sent with temporary access.'
        : 'Invite refreshed but email delivery failed.',
    });
  } catch (error) {
    console.error('[SUPER ADMIN INVITE RESEND] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to resend invite', details: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invite = await prisma.userInvite.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be revoked' }, { status: 400 });
    }

    await prisma.userInvite.update({
      where: { id: invite.id },
      data: { status: 'revoked', updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SUPER ADMIN INVITE REVOKE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to revoke invite', details: message }, { status: 500 });
  }
}
