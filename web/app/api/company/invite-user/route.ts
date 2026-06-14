import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword, generateTemporaryPassword } from '@/lib/password-service';
import {
  assertManagerInviteRole,
  validateReportingManager,
} from '@/lib/invite-reporting-manager';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const COMPANY_INVITE_ROLES = new Set([
  'admin',
  'hr',
  'director',
  'manager',
  'team_lead',
  'employee',
]);

const HR_ADMIN_INVITE_ROLES = new Set(['admin', 'hr', 'super_admin']);
const MANAGER_INVITE_ROLES = new Set(['manager', 'director', 'team_lead']);

/**
 * POST /api/company/invite-user
 *
 * Company admin/HR/manager invites a new user to the company.
 * Persists reporting manager on the invite for production provisioning.
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

    const isHrAdmin = HR_ADMIN_INVITE_ROLES.has(user.role);
    const isManagerLike = MANAGER_INVITE_ROLES.has(user.role);

    if (!isHrAdmin && !isManagerLike) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, firstName, lastName, role, departmentId, managerId } = body;

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Email, first name, last name, and role are required' },
        { status: 400 }
      );
    }

    const normalizedRole = String(role).trim().toLowerCase();
    if (!COMPANY_INVITE_ROLES.has(normalizedRole)) {
      return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
    }

    if (isManagerLike && !isHrAdmin) {
      const roleError = assertManagerInviteRole(normalizedRole);
      if (roleError) {
        return NextResponse.json({ error: roleError }, { status: 403 });
      }
    }

    const resolvedManagerId =
      isManagerLike && !isHrAdmin
        ? managerId || user.id
        : managerId;

    const managerValidation = await validateReportingManager(
      user.orgId,
      normalizedRole,
      resolvedManagerId
    );
    if (!managerValidation.ok) {
      return NextResponse.json({ error: managerValidation.error }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.orgId },
      select: { enabled_roles: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const enabledRoles = (company.enabled_roles as string[]) || [];
    if (!enabledRoles.includes(normalizedRole) && normalizedRole !== 'employee') {
      return NextResponse.json(
        { error: `Role "${normalizedRole}" is not enabled for this company` },
        { status: 400 }
      );
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

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

    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.userInvite.create({
      data: {
        email: email.toLowerCase(),
        role: normalizedRole as Role,
        first_name: firstName,
        last_name: lastName,
        token: inviteToken,
        company_id: user.orgId,
        invited_by_id: user.id,
        department: departmentId || null,
        manager_id: managerValidation.managerId,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept/${inviteToken}`;

    let tempPassword: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);

      await prisma.employee.create({
        data: {
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          primary_role: normalizedRole as Role,
          password_hash: passwordHash,
          invited_by_id: user.id,
          invited_by_type: user.role === 'hr' ? 'hr' : isManagerLike ? 'employee' : 'admin',
          org_id: user.orgId,
          department: departmentId || null,
          manager_id: managerValidation.managerId,
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
        managerId: invite.manager_id,
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
