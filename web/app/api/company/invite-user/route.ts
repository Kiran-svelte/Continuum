import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword, generateTemporaryPassword } from '@/lib/password-service';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/company/invite-user
 * 
 * Company admin/HR invites a new user to the company.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.orgId) {
      return NextResponse.json(
        { error: 'You must belong to a company to invite users' },
        { status: 400 }
      );
    }

    // Only admin or HR can invite
    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins or HR can invite users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, firstName, lastName, role, departmentId, teamId, managerId } = body;

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Email, first name, last name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role is allowed by company config
    const company = await prisma.company.findUnique({
      where: { id: user.orgId },
      select: { enabled_roles: true, requires_hr: true, requires_manager: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const enabledRoles = (company.enabled_roles as string[]) || [];
    if (!enabledRoles.includes(role) && role !== 'employee') {
      return NextResponse.json(
        { error: `Role "${role}" is not enabled for this company` },
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

    // Check for pending invite
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

    // Create invitation
    const invite = await prisma.userInvite.create({
      data: {
        email: email.toLowerCase(),
        role: role as Role,
        first_name: firstName,
        last_name: lastName,
        token: inviteToken,
        company_id: user.orgId,
        invited_by_id: user.id,
        department_id: departmentId,
        team_id: teamId,
        manager_id: managerId,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept/${inviteToken}`;

    // In development, also create employee with temp password
    let tempPassword: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);

      await prisma.employee.create({
        data: {
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          primary_role: role as Role,
          password_hash: passwordHash,
          invited_by_id: user.id,
          invited_by_type: user.role === 'hr' ? 'hr' : 'admin',
          org_id: user.orgId,
          department_id: departmentId,
          team_id: teamId,
          manager_id: managerId,
          must_change_password: true,
          status: 'onboarding',
        },
      });
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expires_at,
      },
      inviteUrl,
      ...(process.env.NODE_ENV === 'development' && { tempPassword }),
    });
  } catch (error) {
    console.error('[COMPANY INVITE USER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to invite user', details: errorMessage },
      { status: 500 }
    );
  }
}
