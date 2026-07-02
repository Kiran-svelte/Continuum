import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { sendSuperAdminUserInviteEmail } from '@/lib/email-service';
import type { Role } from '@prisma/client';
import { isModuleSlug, type ModuleSlug } from '@/lib/core-functions/catalog';

export const dynamic = 'force-dynamic';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      role = 'admin',
      sendInvite = true,
      moduleCap,
    } = body;

    const capSlugs: ModuleSlug[] | null = Array.isArray(moduleCap)
      ? moduleCap.filter((s: unknown): s is ModuleSlug => typeof s === 'string' && isModuleSlug(s))
      : null;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = asString(email).toLowerCase();
    const normalizedFirstName = asString(firstName);
    const normalizedLastName = asString(lastName);

    if (!normalizedEmail || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name cannot be blank' },
        { status: 400 }
      );
    }

    const normalizedRole = asString(role).toLowerCase() || 'admin';

    // Validate role (only allow admin or company owner roles)
    const allowedRoles: Role[] = ['admin', 'hr', 'director', 'manager'];
    if (!allowedRoles.includes(normalizedRole as Role)) {
      return NextResponse.json(
        { error: 'Invalid role. Super admin can only create admin, hr, director, or manager roles.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if invite already sent
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: normalizedEmail,
        status: 'pending',
        expires_at: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
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
        email: normalizedEmail,
        role: normalizedRole as Role,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        token: inviteToken,
        invited_by_super_id: currentUser.id,
        expires_at: expiresAt,
        status: 'pending',
        ...(capSlugs ? { module_cap: capSlugs } : {}),
      },
    });

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept/${inviteToken}`;

    // Send invitation email
    let emailResult: Awaited<ReturnType<typeof sendSuperAdminUserInviteEmail>> | null = null;
    if (sendInvite !== false) {
      emailResult = await sendSuperAdminUserInviteEmail(
        normalizedEmail,
        normalizedFirstName,
        currentUser.email || 'Continuum Super Admin',
        normalizedRole,
        inviteUrl,
        expiresAt
      ).catch((err) => {
        const error = getErrorMessage(err);
        console.error('[SUPER ADMIN CREATE USER] Failed to send email:', error);
        return { success: false, error };
      });
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
      },
      email: {
        attempted: sendInvite !== false,
        sent: emailResult?.success === true,
        transport: emailResult?.transport,
        error: emailResult?.success === false ? emailResult.error : undefined,
      },
      warning:
        sendInvite !== false && emailResult?.success === false
          ? 'Invite was created, but email delivery failed. Resend the invite after email delivery is restored.'
          : undefined,
      inviteUrl,
    });
  } catch (error) {
    console.error('[SUPER ADMIN CREATE USER] Error:', error);
    const errorMessage = getErrorMessage(error);
    const prismaCode = getPrismaErrorCode(error);

    if (prismaCode === 'P2002') {
      return NextResponse.json(
        { error: 'A user or invite with this unique value already exists', details: errorMessage },
        { status: 409 }
      );
    }

    if (prismaCode === 'P2022') {
      return NextResponse.json(
        { error: 'User invite database schema is not up to date. Run pending Prisma migrations.', details: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [invites, employees] = await Promise.all([
      prisma.userInvite.findMany({
        where: { invited_by_super_id: { not: null } },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          status: true,
          expires_at: true,
          accepted_at: true,
          created_at: true,
          updated_at: true,
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.findMany({
        where: { invited_by_type: 'super_admin' },
        orderBy: { created_at: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      invites,
      employees,
    });
  } catch (error) {
    console.error('[SUPER ADMIN LIST USERS] Error:', error);
    const errorMessage = getErrorMessage(error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: errorMessage },
      { status: 500 }
    );
  }
}
