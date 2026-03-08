import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { sendLeaveSubmissionEmail, sendLeaveAutoApprovedEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const leaveSubmitSchema = z.object({
  leave_type: z.string().min(1).max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(1000),
  is_half_day: z.boolean().optional().default(false),
  attachment_url: z.string().url().optional(),
});

function calculateTotalDays(start: Date, end: Date, isHalfDay: boolean): number {
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return isHalfDay ? 0.5 : days;
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'leaves/submit');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requirePermissionGuard(employee, 'leave.apply_own');

    const body = await request.json();
    const parsed = leaveSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const leaveType = sanitizeInput(data.leave_type);
    const reason = sanitizeInput(data.reason);
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'end_date must be on or after start_date' },
        { status: 400 }
      );
    }

    const totalDays = calculateTotalDays(startDate, endDate, data.is_half_day);
    const currentYear = new Date().getFullYear();

    // Check leave balance — ensure a record exists so pending/used tracking is always accurate.
    // `balance` starts as the existing record; if missing, we upsert a fresh one.
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: employee.id,
          leave_type: leaveType,
          year: currentYear,
        },
      },
    });

    if (!balance) {
      // Seed this leave type's balance from the company's configured quota.
      // No catalog fallback — the system is fully config-driven.
      const companyLeaveType = await prisma.leaveType.findUnique({
        where: {
          company_id_code: { company_id: employee.org_id, code: leaveType },
        },
        select: { default_quota: true, is_active: true },
      });

      if (!companyLeaveType || !companyLeaveType.is_active) {
        return NextResponse.json(
          {
            error: 'This leave type is not configured for your company',
            leave_type: leaveType,
          },
          { status: 400 }
        );
      }

      const entitlement = companyLeaveType.default_quota;

      balance = await prisma.leaveBalance.upsert({
        where: {
          emp_id_leave_type_year: {
            emp_id: employee.id,
            leave_type: leaveType,
            year: currentYear,
          },
        },
        create: {
          emp_id: employee.id,
          company_id: employee.org_id,
          leave_type: leaveType,
          year: currentYear,
          annual_entitlement: entitlement,
          carried_forward: 0,
          used_days: 0,
          pending_days: 0,
          encashed_days: 0,
          remaining: entitlement,
        },
        update: {},
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: {
        negative_balance: true,
        sla_hours: true,
        settings: { select: { hr_alerts: true } },
      },
    });

    const hrAlerts = company?.settings?.hr_alerts as Record<string, unknown> | null;
    const autoApproveEnabled = hrAlerts?.auto_approve === true;
    const autoApproveThreshold = typeof hrAlerts?.auto_approve_threshold === 'number'
      ? hrAlerts.auto_approve_threshold
      : 0.9;

    // `balance` is guaranteed non-null here (upserted above).
    // Scoping `remaining` to avoid leaking into the wider function body.
    const remaining =
      balance.annual_entitlement +
      balance.carried_forward -
      balance.used_days -
      balance.pending_days -
      balance.encashed_days;

    if (remaining < totalDays && !company?.negative_balance) {
      return NextResponse.json(
        {
          error: 'Insufficient leave balance',
          remaining,
          requested: totalDays,
          leave_type: leaveType,
        },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests (duplicate detection)
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        emp_id: employee.id,
        status: { in: ['pending', 'approved', 'escalated'] },
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
      select: { id: true, leave_type: true, start_date: true, end_date: true, status: true },
    });

    if (overlapping) {
      const oStart = overlapping.start_date.toISOString().split('T')[0];
      const oEnd = overlapping.end_date.toISOString().split('T')[0];
      return NextResponse.json(
        {
          error: `You already have a ${overlapping.status} ${overlapping.leave_type} request from ${oStart} to ${oEnd} that overlaps with these dates`,
          overlapping_request_id: overlapping.id,
        },
        { status: 409 }
      );
    }

    // Call Python constraint engine with timeout
    let constraintResult: Record<string, unknown> | null = null;
    let constraintStatus: 'pass' | 'warnings' | 'fail' = 'pass';

    const constraintEngineUrl = process.env.CONSTRAINT_ENGINE_URL;
    if (constraintEngineUrl) {
      try {
        // Add 15 second timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const constraintResp = await fetch(`${constraintEngineUrl}/api/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.CRON_SECRET || '',
          },
          body: JSON.stringify({
            employee_id: employee.id,
            company_id: employee.org_id,
            leave_type: leaveType,
            start_date: data.start_date,
            end_date: data.end_date,
            total_days: totalDays,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        constraintResult = (await constraintResp.json()) as Record<string, unknown>;

        // Engine returns: { passed: bool, violations: [], warnings: [], recommendation: string, confidence_score: float }
        const violations = constraintResult.violations as unknown[] | undefined;
        const warnings = constraintResult.warnings as unknown[] | undefined;
        
        if (violations && violations.length > 0) {
          constraintStatus = 'fail';
        } else if (warnings && warnings.length > 0) {
          constraintStatus = 'warnings';
        }
      } catch (err) {
        // Constraint engine unavailable or timeout — proceed with manual review
        console.warn('[LeaveSubmit] Constraint engine unavailable or timeout:', err);
        // Mark as needing escalation for manual review
        constraintStatus = 'warnings';
        constraintResult = {
          passed: true,
          violations: [],
          warnings: [{
            rule_id: 'SYSTEM',
            name: 'Manual Review Required',
            message: 'Constraint engine was unavailable. Request will be escalated for manual review.',
            is_blocking: false,
          }],
          recommendation: 'MANUAL_REVIEW',
          confidence_score: 0.5,
        };
      }
    }

    if (constraintStatus === 'fail') {
      return NextResponse.json(
        { error: 'Constraint violations', violations: constraintResult },
        { status: 400 }
      );
    }

    // Determine request status:
    // - auto-approve if engine recommends APPROVE and company has it enabled
    // - escalate if there are non-blocking warnings
    // - otherwise pending
    let requestStatus: 'pending' | 'approved' | 'escalated' = 'pending';
    if (constraintStatus === 'warnings') {
      requestStatus = 'escalated';
    } else if (
      autoApproveEnabled &&
      constraintResult?.recommendation === 'APPROVE' &&
      typeof constraintResult?.confidence_score === 'number' &&
      constraintResult.confidence_score >= autoApproveThreshold
    ) {
      requestStatus = 'approved';
    }

    const slaDeadline = company?.sla_hours
      ? new Date(Date.now() + company.sla_hours * 60 * 60 * 1000)
      : null;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        emp_id: employee.id,
        company_id: employee.org_id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        is_half_day: data.is_half_day,
        reason,
        status: requestStatus,
        attachment_url: data.attachment_url ?? null,
        sla_deadline: requestStatus === 'pending' || requestStatus === 'escalated' ? slaDeadline : null,
        approved_at: requestStatus === 'approved' ? new Date() : undefined,
        approver_comments: requestStatus === 'approved'
          ? `Auto-approved by constraint engine (confidence: ${((constraintResult?.confidence_score as number ?? 0) * 100).toFixed(0)}%)`
          : undefined,
        constraint_result: constraintResult
          ? (constraintResult as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // Update leave balance: auto-approved = used immediately; pending = pending_days
    // Also sync the `remaining` column so it stays consistent for reporting.
    if (requestStatus === 'approved') {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          used_days: { increment: totalDays },
          remaining: { decrement: totalDays },
        },
      });
    } else {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pending_days: { increment: totalDays },
          remaining: { decrement: totalDays },
        },
      });
    }

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_SUBMIT,
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      newState: {
        leave_type: leaveType,
        start_date: data.start_date,
        end_date: data.end_date,
        total_days: totalDays,
        status: requestStatus,
      },
    });

    // Send email notifications (non-blocking)
    try {
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      if (requestStatus === 'approved') {
        // Auto-approved - notify employee
        await sendLeaveAutoApprovedEmail(
          employee.email,
          employeeName,
          leaveType,
          data.start_date,
          data.end_date,
          (constraintResult?.confidence_score as number) || 0.9
        );
      } else {
        // Pending/escalated - notify manager if exists
        const employeeWithManager = await prisma.employee.findUnique({
          where: { id: employee.id },
          select: { manager_id: true },
        });
        if (employeeWithManager?.manager_id) {
          const manager = await prisma.employee.findUnique({
            where: { id: employeeWithManager.manager_id },
            select: { email: true, first_name: true, last_name: true },
          });
          if (manager?.email) {
            const managerName = `${manager.first_name} ${manager.last_name}`;
            await sendLeaveSubmissionEmail(
              manager.email,
              managerName,
              employeeName,
              leaveType,
              data.start_date,
              data.end_date,
              totalDays,
              reason
            );
          }
        }
      }
    } catch (emailError) {
      console.error('[LeaveSubmit] Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
