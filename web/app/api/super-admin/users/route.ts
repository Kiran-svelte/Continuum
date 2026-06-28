import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { sendSuperAdminUserInviteEmail } from '@/lib/email-service';
import { buildActionOutcome, sideEffectFromEmail, sideEffectSkipped } from '@/lib/action-outcome';
import { buildAppUrl } from '@/lib/url-origin';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /api/super-admin/users
 * 
 * Creates a new user (company owner/admin) by super admin.
 * Sends an invitation email with temporary credentials.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      email, 
      firstName, 
      lastName, 
      role = 'admin',
      sendInvite = true,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return jsonNoStore(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Validate role (only allow admin or company owner roles)
    const allowedRoles: Role[] = ['admin', 'hr', 'director', 'manager'];
    if (!allowedRoles.includes(role as Role)) {
      return jsonNoStore(
        { error: 'Invalid role. Super admin can only create admin, hr, director, or manager roles.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmployee) {
      return jsonNoStore(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if invite already sent
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'pending',
        expires_at: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return jsonNoStore(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the invitation
    const invite = await prisma.userInvite.create({
      data: {
        email: email.toLowerCase(),
        role: role as Role,
        first_name: firstName,
        last_name: lastName,
        token: inviteToken,
        invited_by_super_id: currentUser.id,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

    // Build the accept URL
    const inviteUrl = buildAppUrl(`/invite/accept/${inviteToken}`);
    const shouldSendInvite = sendInvite !== false;

    // Send invitation email — non-blocking: if email fails, the invite record
    // is still created and the admin can copy the URL from the response.
    const inviterName = currentUser.firstName
      ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
      : 'Continuum Platform';

    const emailResult = shouldSendInvite
      ? await sendSuperAdminUserInviteEmail(
          email.toLowerCase(),
          firstName,
          inviterName,
          role as Role,
          inviteUrl,
          expiresAt
        ).catch((err) => {
          console.error('[SUPER ADMIN CREATE USER] Email send failed:', err);
          return { success: false, error: 'Email delivery failed' };
        })
      : { success: false, error: 'Invite email skipped by request' };

    if (!emailResult.success) {
      console.warn('[SUPER ADMIN CREATE USER] Invite created but email failed:', emailResult.error);
    }

    const emailSideEffect = shouldSendInvite
      ? sideEffectFromEmail(`Invitation email to ${email.toLowerCase()}`, emailResult)
      : sideEffectSkipped('email', `Invitation email to ${email.toLowerCase()}`, 'Skipped by request');

    const actionOutcome = buildActionOutcome({
      primarySucceeded: true,
      title: 'Invitation created',
      message: emailResult.success
        ? 'The invite was created and the email was sent.'
        : 'The invite was created, but email delivery needs attention.',
      sideEffects: [emailSideEffect],
    });

    return jsonNoStore({
      success: true,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : emailResult.error ?? 'Email delivery failed',
      actionOutcome,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
      },
      ...(process.env.NODE_ENV !== 'production' ? { inviteUrl } : {}),
    });
  } catch (error) {
    console.error('[SUPER ADMIN CREATE USER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonNoStore(
      { error: 'Failed to create user', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/super-admin/users
 * 
 * Lists all users created by super admin.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const inviteWhere = { invited_by_super_id: { not: null } };
    const employeeWhere = { invited_by_type: 'super_admin' };

    const [
      invites,
      employees,
      totalInvites,
      totalEmployees,
      pendingInvites,
      activeUsers,
    ] = await Promise.all([
      prisma.userInvite.findMany({
        where: inviteWhere,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.findMany({
        where: employeeWhere,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.userInvite.count({ where: inviteWhere }),
      prisma.employee.count({ where: employeeWhere }),
      prisma.userInvite.count({ where: { ...inviteWhere, status: 'pending' } }),
      prisma.employee.count({ where: { ...employeeWhere, status: 'active' } }),
    ]);

    return jsonNoStore({
      invites,
      employees,
      pagination: {
        page,
        limit,
        totalInvites,
        totalEmployees,
      },
      stats: {
        pendingInvites,
        activeUsers,
        totalInvites,
      },
    });
  } catch (error) {
    console.error('[SUPER ADMIN LIST USERS] Error:', error);
    return jsonNoStore(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
