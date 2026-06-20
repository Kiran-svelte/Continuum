import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword, validatePassword } from '@/lib/password-service';
import {
  assertManagerInviteRole,
  validateReportingManager,
} from '@/lib/invite-reporting-manager';
import { isEmailVerified } from '@/lib/product-readiness';
import { sendInviteEmail } from '@/lib/email-service';
import { buildInviteAcceptUrl } from '@/lib/invite-url';
import { promiseTimeout } from '@/lib/promise-timeout';
import { findEmployeeBlockingEmail } from '@/lib/employee-email-lifecycle';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const INVITE_EMAIL_TIMEOUT_MS = 12_000;

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

function resolveInviteEmail(
  email: string | undefined,
  username: string | undefined,
  joinCode: string
): string | null {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) return normalizedEmail;
  const normalizedUsername = username?.trim().toLowerCase();
  if (!normalizedUsername) return null;
  return `${normalizedUsername}@${joinCode.toLowerCase()}.continuum.local`;
}

/**
 * GET /api/company/invite-user
 * Lists pending company user invites for admin/HR.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isHrAdmin = ['admin', 'hr', 'super_admin'].includes(user.role);
    const isManagerLike = ['manager', 'director', 'team_lead'].includes(user.role);
    if (!isHrAdmin && !isManagerLike) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invites = await prisma.userInvite.findMany({
      where: {
        company_id: user.orgId,
        status: 'pending',
        expires_at: { gt: new Date() },
        ...(isHrAdmin
          ? {}
          : {
              OR: [{ manager_id: user.id }, { invited_by_id: user.id }],
            }),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        department: true,
        expires_at: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        first_name: invite.first_name,
        last_name: invite.last_name,
        role: invite.role,
        department: invite.department,
        expires_at: invite.expires_at,
        used_at: null,
        created_at: invite.created_at,
      })),
    });
  } catch (error) {
    console.error('[COMPANY INVITE LIST] Error:', error);
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}

/**
 * POST /api/company/invite-user
 *
 * Company admin/HR/manager invites or directly provisions a user.
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

    let emailVerificationWarning: string | undefined;
    if (user.role !== 'super_admin') {
      const verified = await isEmailVerified(user.id);
      if (!verified) {
        emailVerificationWarning =
          'Your email is not verified yet. Invites will still be created, but verify your email for security notifications.';
      }
    }

    const body = await request.json();
    const {
      authMode = 'invite',
      email,
      username,
      password,
      firstName,
      lastName,
      role,
      departmentId,
      department,
      managerId,
      phone,
    } = body;

    const departmentValue = departmentId || department || null;

    if (!firstName?.trim() || !lastName?.trim() || !role) {
      return NextResponse.json(
        { error: 'First name, last name, and role are required' },
        { status: 400 }
      );
    }

    const companyRecord = await prisma.company.findUnique({
      where: { id: user.orgId },
      select: { enabled_roles: true, name: true, join_code: true },
    });

    if (!companyRecord) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const resolvedEmail = resolveInviteEmail(email, username, companyRecord.join_code ?? '');
    if (!resolvedEmail) {
      return NextResponse.json(
        { error: 'Email or username is required' },
        { status: 400 }
      );
    }

    if (authMode === 'direct' && !password) {
      return NextResponse.json(
        { error: 'Password is required for direct credential provisioning' },
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
      isManagerLike && !isHrAdmin ? managerId || user.id : managerId;

    const managerValidation = await validateReportingManager(
      user.orgId,
      normalizedRole,
      resolvedManagerId
    );
    if (!managerValidation.ok) {
      return NextResponse.json({ error: managerValidation.error }, { status: 400 });
    }

    const enabledRoles = (companyRecord.enabled_roles as string[]) || [];
    if (!enabledRoles.includes(normalizedRole) && normalizedRole !== 'employee') {
      return NextResponse.json(
        { error: `Role "${normalizedRole}" is not enabled for this company` },
        { status: 400 }
      );
    }

    const blockingEmployee = await findEmployeeBlockingEmail(prisma, resolvedEmail);

    if (blockingEmployee) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: resolvedEmail,
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

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    if (authMode === 'direct') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.errors[0] || 'Password does not meet security requirements' },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);
      const employee = await prisma.employee.create({
        data: {
          email: resolvedEmail,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone?.trim() || null,
          primary_role: normalizedRole as Role,
          password_hash: passwordHash,
          invited_by_id: user.id,
          invited_by_type: user.role === 'hr' ? 'hr' : isManagerLike ? 'employee' : 'admin',
          org_id: user.orgId,
          department: departmentValue,
          manager_id: managerValidation.managerId,
          must_change_password: true,
          status: 'active',
        },
      });

      return NextResponse.json({
        success: true,
        mode: 'direct',
        employee: {
          id: employee.id,
          email: employee.email,
          role: employee.primary_role,
        },
      });
    }

    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.userInvite.create({
      data: {
        email: resolvedEmail,
        role: normalizedRole as Role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        token: inviteToken,
        company_id: user.orgId,
        invited_by_id: user.id,
        department: departmentValue,
        manager_id: managerValidation.managerId,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

    const inviteUrl = buildInviteAcceptUrl(inviteToken, { request });

    let inviteEmailSent = false;
    let inviteEmailError: string | undefined;

    try {
      const emailResult = await promiseTimeout(
        sendInviteEmail(
          resolvedEmail,
          companyRecord.name,
          inviterName,
          inviteToken,
          normalizedRole,
          departmentValue || undefined
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
      mode: 'invite',
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        managerId: invite.manager_id,
        expiresAt: invite.expires_at,
      },
      inviteUrl,
      inviteLink: inviteUrl,
      email: {
        attempted: true,
        sent: inviteEmailSent,
        error: inviteEmailError,
      },
      ...(inviteEmailSent
        ? {}
        : {
            warning:
              inviteEmailError ||
              'Invitation saved but email delivery failed. Use resend or share the invite link manually.',
          }),
      ...(emailVerificationWarning ? { emailVerificationWarning } : {}),
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
