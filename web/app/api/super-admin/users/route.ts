import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword, generateTemporaryPassword } from '@/lib/password-service';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

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
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Validate role (only allow admin or company owner roles)
    const allowedRoles: Role[] = ['admin', 'hr', 'director', 'manager'];
    if (!allowedRoles.includes(role as Role)) {
      return NextResponse.json(
        { error: 'Invalid role. Super admin can only create admin, hr, director, or manager roles.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
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
        email: email.toLowerCase(),
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

    // TODO: Send invitation email
    // For now, we'll return the invite token for testing
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept/${inviteToken}`;

    // In development, also generate a temp password for easier testing
    let tempPassword: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      tempPassword = generateTemporaryPassword();
      
      // Create the employee record directly with temp password
      const passwordHash = await hashPassword(tempPassword);
      
      await prisma.employee.create({
        data: {
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          primary_role: role as Role,
          password_hash: passwordHash,
          invited_by_id: currentUser.id,
          invited_by_type: 'super_admin',
          must_change_password: true,
          status: 'onboarding',
          // No org_id yet - they will create a company on first login
        },
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
      inviteUrl,
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && { tempPassword }),
    });
  } catch (error) {
    console.error('[SUPER ADMIN CREATE USER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
        include: {
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
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
