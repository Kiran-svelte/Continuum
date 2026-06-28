/**
 * Resend selected transactional emails with explicit delivery outcome.
 *
 * POST /api/email/resend
 * Body: { type: 'invite' | 'welcome' | 'payslip' | 'leave_decision', targetId: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
} from '@/lib/auth-guard';
import {
  buildActionOutcome,
  sideEffectFromEmail,
  sideEffectSkipped,
} from '@/lib/action-outcome';
import {
  sendEmail,
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
} from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import { assertModule } from '@/lib/core-functions/assert-module';
import { canActOnLeaveRequest } from '@/lib/leave-approval-routing';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const resendRateLimit = new Map<string, { count: number; windowStart: number }>();
const MAX_RESENDS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

type ResendType = 'invite' | 'welcome' | 'payslip' | 'leave_decision';

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = resendRateLimit.get(key);
  if (!entry || now - entry.windowStart > HOUR_MS) {
    resendRateLimit.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_RESENDS_PER_HOUR) return false;
  entry.count += 1;
  return true;
}

function isAllowedOperator(actor: { primary_role: string; secondary_roles: string[] | null }): boolean {
  return (
    ['admin', 'hr', 'super_admin'].includes(actor.primary_role) ||
    actor.secondary_roles?.some((role) => role === 'admin' || role === 'hr') === true
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await getAuthEmployee(request);
    requireCompanyContext(actor);

    const body = await request.json() as { type?: string; targetId?: string };
    const type = body.type as ResendType | undefined;
    const targetId = body.targetId?.trim();

    if (!type || !['invite', 'welcome', 'payslip', 'leave_decision'].includes(type)) {
      return NextResponse.json({ error: 'Unknown or missing email type' }, { status: 400 });
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    }

    const rateLimitKey = `${actor.org_id}:${type}:${targetId}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before resending.' },
        { status: 429 }
      );
    }

    if (type === 'invite') {
      if (!isAllowedOperator(actor)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      requirePermissionGuard(actor, 'employee.onboard');
      return resendInvite(actor.org_id, targetId);
    }
    if (type === 'welcome') {
      if (!isAllowedOperator(actor)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      requirePermissionGuard(actor, 'employee.onboard');
      return resendWelcome(actor.org_id, targetId);
    }
    if (type === 'leave_decision') {
      const moduleGuard = await assertModule(actor.org_id, 'leave');
      if (moduleGuard) return moduleGuard;

      const canApproveAny = actor.permissions.includes('*') || actor.permissions.includes('leave.approve_any');
      const canApproveTeam = actor.permissions.includes('*') || actor.permissions.includes('leave.approve_team');
      if (!canApproveAny && !canApproveTeam) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return resendLeaveDecision(actor, targetId);
    }

    const moduleGuard = await assertModule(actor.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    if (isAllowedOperator(actor)) {
      requirePermissionGuard(actor, 'payroll.view_all');
      return resendPayslip(actor.org_id, targetId);
    }

    requirePermissionGuard(actor, 'payroll.view_own');
    return resendPayslip(actor.org_id, targetId, actor.id);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Email Resend]', error);
    return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
  }
}

async function resendLeaveDecision(
  actor: Awaited<ReturnType<typeof getAuthEmployee>> & { org_id: string },
  leaveRequestId: string
): Promise<NextResponse> {
  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      id: leaveRequestId,
      company_id: actor.org_id,
      status: { in: ['approved', 'rejected'] },
    },
    select: {
      id: true,
      emp_id: true,
      leave_type: true,
      start_date: true,
      end_date: true,
      status: true,
      approver_comments: true,
      employee: {
        select: {
          email: true,
          first_name: true,
          last_name: true,
        },
      },
      approver: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  if (!leaveRequest) {
    return NextResponse.json({ error: 'Approved or rejected leave request not found' }, { status: 404 });
  }

  const canAct = await canActOnLeaveRequest({
    requesterId: leaveRequest.emp_id,
    approverId: actor.id,
    companyId: actor.org_id,
    approverRole: actor.primary_role,
  });

  if (!canAct) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const recipientEmail = leaveRequest.employee.email;
  if (!recipientEmail) {
    const actionOutcome = buildActionOutcome({
      primarySucceeded: false,
      title: 'Leave decision email failed',
      sideEffects: [
        sideEffectSkipped('email', 'Leave decision email to employee', 'Employee has no email address'),
      ],
    });

    return NextResponse.json(
      {
        ok: false,
        emailSent: false,
        emailError: 'Employee has no email address',
        actionOutcome,
      },
      { status: 422 }
    );
  }

  const employeeName = `${leaveRequest.employee.first_name} ${leaveRequest.employee.last_name}`.trim();
  const actorName = `${actor.first_name} ${actor.last_name}`.trim();
  const approverName =
    leaveRequest.approver
      ? `${leaveRequest.approver.first_name} ${leaveRequest.approver.last_name}`.trim()
      : actorName || 'Approver';
  const startDate = leaveRequest.start_date.toISOString().split('T')[0]!;
  const endDate = leaveRequest.end_date.toISOString().split('T')[0]!;

  const email =
    leaveRequest.status === 'approved'
      ? await sendLeaveApprovalEmail(
          recipientEmail,
          employeeName,
          leaveRequest.leave_type,
          startDate,
          endDate,
          approverName
        )
      : await sendLeaveRejectionEmail(
          recipientEmail,
          employeeName,
          leaveRequest.leave_type,
          startDate,
          endDate,
          approverName,
          leaveRequest.approver_comments || 'No reason provided'
        );

  const actionOutcome = buildActionOutcome({
    primarySucceeded: email.success,
    title: email.success ? 'Leave decision email resent' : 'Leave decision email failed',
    sideEffects: [sideEffectFromEmail(`Leave decision email to ${recipientEmail}`, email)],
  });

  return NextResponse.json(
    {
      ok: email.success,
      emailSent: email.success,
      emailError: email.success ? null : email.error ?? 'Email delivery failed',
      actionOutcome,
    },
    { status: email.success ? 200 : 502 }
  );
}

async function resendInvite(companyId: string, targetId: string): Promise<NextResponse> {
  const invite = await prisma.employeeInvite.findFirst({
    where: {
      company_id: companyId,
      used_at: null,
      OR: [{ id: targetId }, { token: targetId }],
    },
    select: {
      id: true,
      email: true,
      token: true,
      expires_at: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: 'No pending invite found' }, { status: 404 });
  }

  const inviteUrl = buildAppUrl(`/invite/accept/${invite.token}`);
  const email = await sendEmail(
    invite.email,
    'Invitation to Continuum HR',
    [
      '<p>Hi,</p>',
      '<p>You have been invited to join your organization on Continuum HR.</p>',
      `<p><a href="${inviteUrl}">Accept your invitation</a></p>`,
      `<p>This link expires on ${new Date(invite.expires_at).toLocaleDateString('en-IN')}.</p>`,
      '<p>If you did not expect this, please ignore this email.</p>',
    ].join(''),
    { category: 'invite' }
  );

  if (email.success) {
    await prisma.employeeInvite.update({
      where: { id: invite.id },
      data: { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
  }

  const actionOutcome = buildActionOutcome({
    primarySucceeded: email.success,
    title: email.success ? 'Invite resent' : 'Invite email failed',
    sideEffects: [sideEffectFromEmail(`Invitation email to ${invite.email}`, email)],
  });

  return NextResponse.json(
    {
      ok: email.success,
      emailSent: email.success,
      emailError: email.success ? null : email.error ?? 'Email delivery failed',
      actionOutcome,
    },
    { status: email.success ? 200 : 502 }
  );
}

async function resendWelcome(companyId: string, employeeId: string): Promise<NextResponse> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, org_id: companyId },
    select: { email: true, first_name: true },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const loginUrl = buildAppUrl('/sign-in');
  const email = await sendEmail(
    employee.email,
    'Welcome to Continuum HR',
    [
      `<p>Hi ${employee.first_name},</p>`,
      '<p>Welcome to Continuum HR. Your account is ready.</p>',
      `<p><a href="${loginUrl}">Sign in to your account</a></p>`,
    ].join(''),
    { category: 'welcome' }
  );

  const actionOutcome = buildActionOutcome({
    primarySucceeded: email.success,
    title: email.success ? 'Welcome email resent' : 'Welcome email failed',
    sideEffects: [sideEffectFromEmail(`Welcome email to ${employee.email}`, email)],
  });

  return NextResponse.json(
    {
      ok: email.success,
      emailSent: email.success,
      emailError: email.success ? null : email.error ?? 'Email delivery failed',
      actionOutcome,
    },
    { status: email.success ? 200 : 502 }
  );
}

async function resendPayslip(
  companyId: string,
  payslipId: string,
  actorEmployeeId?: string
): Promise<NextResponse> {
  const payslip = await prisma.payrollSlip.findFirst({
    where: {
      id: payslipId,
      company_id: companyId,
      ...(actorEmployeeId ? { emp_id: actorEmployeeId } : {}),
    },
    select: {
      month: true,
      year: true,
      net_pay: true,
      employee: { select: { email: true, first_name: true } },
    },
  });

  if (!payslip) {
    return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthLabel = monthNames[payslip.month - 1] ?? `Month ${payslip.month}`;
  const viewUrl = buildAppUrl('/employee/payslips');
  const email = await sendEmail(
    payslip.employee.email,
    `Payslip for ${monthLabel} ${payslip.year} is ready`,
    [
      `<p>Hi ${payslip.employee.first_name},</p>`,
      `<p>Your payslip for <strong>${monthLabel} ${payslip.year}</strong> is ready.</p>`,
      `<p>Net Pay: <strong>INR ${payslip.net_pay.toLocaleString('en-IN')}</strong></p>`,
      `<p><a href="${viewUrl}">View your payslips</a></p>`,
    ].join(''),
    { category: 'payroll' }
  );

  const actionOutcome = buildActionOutcome({
    primarySucceeded: email.success,
    title: email.success ? 'Payslip notification resent' : 'Payslip email failed',
    sideEffects: [sideEffectFromEmail(`Payslip email to ${payslip.employee.email}`, email)],
  });

  return NextResponse.json(
    {
      ok: email.success,
      emailSent: email.success,
      emailError: email.success ? null : email.error ?? 'Email delivery failed',
      actionOutcome,
    },
    { status: email.success ? 200 : 502 }
  );
}
