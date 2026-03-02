import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireRole,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
  payroll_run_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');
    requirePermissionGuard(employee, 'payroll.approve');

    const body = await request.json();
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { payroll_run_id } = parsed.data;

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: payroll_run_id },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (payrollRun.status !== 'under_review') {
      return NextResponse.json(
        { error: `Cannot approve payroll with status '${payrollRun.status}'. Must be 'under_review'.` },
        { status: 400 }
      );
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: payroll_run_id },
      data: {
        status: 'approved',
        approved_by: employee.id,
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.PAYROLL_APPROVE,
      entityType: 'PayrollRun',
      entityId: payroll_run_id,
      previousState: { status: payrollRun.status },
      newState: { status: 'approved', approved_by: employee.id },
    });

    return NextResponse.json(updatedRun);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
