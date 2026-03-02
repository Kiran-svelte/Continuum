import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

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

    // Check leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: employee.id,
          leave_type: leaveType,
          year: currentYear,
        },
      },
    });

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: { negative_balance: true, sla_hours: true },
    });

    if (balance) {
      const remaining =
        balance.annual_entitlement +
        balance.carried_forward -
        balance.used_days -
        balance.pending_days -
        balance.encashed_days;

      if (remaining < totalDays && !company?.negative_balance) {
        return NextResponse.json(
          { error: 'Insufficient leave balance', remaining, requested: totalDays },
          { status: 400 }
        );
      }
    }

    // Call Python constraint engine
    let constraintResult: Record<string, unknown> | null = null;
    let constraintStatus: 'pass' | 'warnings' | 'fail' = 'pass';

    const constraintEngineUrl = process.env.CONSTRAINT_ENGINE_URL;
    if (constraintEngineUrl) {
      try {
        const constraintResp = await fetch(`${constraintEngineUrl}/api/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employee.id,
            company_id: employee.org_id,
            leave_type: leaveType,
            start_date: data.start_date,
            end_date: data.end_date,
            total_days: totalDays,
          }),
        });
        constraintResult = (await constraintResp.json()) as Record<string, unknown>;

        if (constraintResult.status === 'fail') {
          constraintStatus = 'fail';
        } else if (constraintResult.status === 'warnings') {
          constraintStatus = 'warnings';
        }
      } catch {
        // Constraint engine unavailable — proceed without it
      }
    }

    if (constraintStatus === 'fail') {
      return NextResponse.json(
        { error: 'Constraint violations', violations: constraintResult },
        { status: 400 }
      );
    }

    const requestStatus = constraintStatus === 'warnings' ? 'escalated' : 'pending';

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
        sla_deadline: slaDeadline,
        constraint_result: constraintResult
          ? (constraintResult as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // Update pending_days on balance
    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pending_days: { increment: totalDays } },
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
