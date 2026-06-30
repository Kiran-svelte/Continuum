import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

/**
 * Valid payroll state transitions:
 *   draft → generated (done by generate API)
 *   generated → under_review
 *   under_review → approved | rejected
 *   approved → processed
 *   processed → paid
 *   rejected → draft (re-generate)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  generated: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['processed'],
  processed: ['paid'],
  rejected: ['draft'],
};

const AUDIT_ACTION_MAP: Record<string, string> = {
  approved: AUDIT_ACTIONS.PAYROLL_APPROVE,
  processed: AUDIT_ACTIONS.PAYROLL_PROCESS,
  paid: AUDIT_ACTIONS.PAYROLL_PROCESS,
};

const statusSchema = z.object({
  payroll_run_id: z.string().min(1),
  new_status: z.enum(['under_review', 'approved', 'rejected', 'processed', 'paid', 'draft']),
  comments: z.string().max(500).optional(),
});

/**
 * GET /api/payroll/status?month=M&year=Y
 * Returns the current payroll run status for a given period.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'payroll.view_all');

    const url = new URL(request.url);
    const month = parseInt(url.searchParams.get('month') || '0', 10);
    const year = parseInt(url.searchParams.get('year') || String(new Date().getFullYear()), 10);

    const where: Record<string, unknown> = { company_id: employee.org_id };
    if (month) where.month = month;
    if (year) where.year = year;

    const run = await prisma.payrollRun.findFirst({ where, orderBy: { created_at: 'desc' } });
    return NextResponse.json({ run: run ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { payroll_run_id, new_status, comments } = parsed.data;
    if (new_status === 'processed' || new_status === 'paid') {
      requirePermissionGuard(employee, 'payroll.process');
    } else if (new_status === 'draft') {
      requirePermissionGuard(employee, 'payroll.generate');
    } else {
      requirePermissionGuard(employee, 'payroll.approve');
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id: payroll_run_id },
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (run.company_id !== employee.org_id!) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const allowedTransitions = VALID_TRANSITIONS[run.status] || [];
    if (!allowedTransitions.includes(new_status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from '${run.status}' to '${new_status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status: new_status };

    if (new_status === 'approved') {
      updateData.approved_by = employee.id;
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payroll_run_id, status: run.status },
      data: updateData,
    });

    const auditAction = AUDIT_ACTION_MAP[new_status] ?? AUDIT_ACTIONS.PAYROLL_GENERATE;

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: auditAction,
      entityType: 'PayrollRun',
      entityId: payroll_run_id,
      previousState: { status: run.status },
      newState: { status: new_status, comments },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
