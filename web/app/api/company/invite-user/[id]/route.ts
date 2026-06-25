import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import type { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { sendInviteEmail } from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import { buildActionOutcome, sideEffectFromEmail } from '@/lib/action-outcome';

export const dynamic = 'force-dynamic';

const updateInviteSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'hr', 'director', 'manager', 'team_lead', 'employee']).optional(),
  department: z.string().max(120).optional().nullable(),
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

    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins or HR can edit invites' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const invite = await prisma.userInvite.findFirst({
      where: {
        id,
        company_id: user.orgId,
      },
      select: { id: true, email: true, status: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
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

    const { email, firstName, lastName, role, department } = parsed.data;
    if (!email && !firstName && !lastName && !role && department === undefined) {
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

      const existingEmployee = await prisma.employee.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingEmployee) {
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins or HR can resend invites' }, { status: 403 });
    }

    const { id } = await params;
    const invite = await prisma.userInvite.findFirst({
      where: { id, company_id: user.orgId },
      select: { id: true, email: true, status: true, role: true, department: true },
    });
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Only pending invites can be resent' }, { status: 400 });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await prisma.userInvite.update({
      where: { id: invite.id },
      data: { token, expires_at: expiresAt, updated_at: new Date() },
      select: { id: true, email: true, role: true, expires_at: true, department: true },
    });
    const company = await prisma.company.findUnique({ where: { id: user.orgId }, select: { name: true } });
    // Await delivery so a failed resend is reported instead of being silently
    // dropped when the serverless function suspends after the response.
    const emailResult = await sendInviteEmail(
      updated.email,
      company?.name || 'your company',
      `${user.firstName} ${user.lastName}`.trim() || user.email,
      token,
      updated.role,
      updated.department || undefined,
      buildAppUrl(`/invite/accept/${token}`),
    ).catch((err) => {
      console.error('[InviteResend] Email failed:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Email delivery failed' };
    });
    const actionOutcome = buildActionOutcome({
      primarySucceeded: true,
      title: emailResult.success ? 'Invitation resent' : 'Invite updated — email not delivered',
      sideEffects: [
        sideEffectFromEmail(`Invitation email to ${updated.email}`, emailResult),
      ],
    });
    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error ?? 'Email delivery failed',
      actionOutcome,
      invite: updated,
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
    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins or HR can revoke invites' }, { status: 403 });
    }
    const { id } = await params;
    const invite = await prisma.userInvite.findFirst({
      where: { id, company_id: user.orgId },
      select: { id: true, status: true },
    });
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
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
